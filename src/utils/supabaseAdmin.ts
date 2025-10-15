import { supabase } from '@/integrations/supabase/client';
import type { Profile, Role } from '@/types/user';

// Fallback direto para API REST do Supabase quando Edge Functions falham
export class SupabaseAdminAPI {
  private static baseUrl = import.meta.env.VITE_SUPABASE_URL;
  private static anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  private static async makeRequest<T>(endpoint: string, method: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/rest/v1/${endpoint}`;
    
    console.log(`🔧 [SUPABASE_API] ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.anonKey}`,
        'apikey': this.anonKey,
        'Prefer': 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('📡 [SUPABASE_API] Resposta da API REST:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SUPABASE_API] Erro na API REST:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  static async listUsers(): Promise<{ success: boolean; data: Profile[]; error?: string }> {
    try {
      console.log('📋 [SUPABASE_API] Listando usuários via API REST...');
      const profiles = await this.makeRequest<Profile[]>(
        'profiles?select=id,email,full_name,role&order=email.asc',
        'GET'
      );
      console.log('✅ [SUPABASE_API] Dados recebidos da API REST:', {
        count: Array.isArray(profiles) ? profiles.length : 'não é array',
        data: profiles
      });
      return { success: true, data: Array.isArray(profiles) ? profiles : [] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ [SUPABASE_API] Erro ao listar usuários via API REST:', error);
      return { success: false, error: message, data: [] };
    }
  }

  static async updateRole(userId: string, newRole: Role): Promise<{ ok: boolean; error?: string }> {
    try {
      console.log(`🔄 [SUPABASE_API] Atualizando papel via API REST: ${userId} -> ${newRole}`);
      await this.makeRequest<void>(`profiles?id=eq.${userId}`, 'PATCH', { role: newRole });
      return { ok: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ [SUPABASE_API] Erro ao atualizar papel via API REST:', error);
      return { ok: false, error: message };
    }
  }

  static async deleteUser(userId: string): Promise<{ ok: boolean; warning?: string; error?: string }> {
    try {
      console.log(`🗑️ [SUPABASE_API] Excluindo usuário via API REST: ${userId}`);
      
      // Primeiro tenta excluir do perfil
      await this.makeRequest<void>(`profiles?id=eq.${userId}`, 'DELETE');
      
      // Nota: Não podemos excluir da auth.users via API REST
      // Isso requer service role key que não temos no frontend
      console.warn('⚠️ [SUPABASE_API] Usuário removido do perfil, mas permanece na autenticação');
      
      return { ok: true, warning: 'Usuário removido do perfil, mas permanece na autenticação' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ [SUPABASE_API] Erro ao excluir usuário via API REST:', error);
      return { ok: false, error: message };
    }
  }
}

// Wrapper com retry e fallback automático
export class RobustSupabaseAdmin {
  private static async tryEdgeFunction(
    functionName: string,
    body: unknown,
    maxRetries = 2,
    timeoutMs = 4000
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [ROBUST_ADMIN] Tentativa ${attempt}/${maxRetries} - Edge Function: ${functionName}`);
        const attemptTimeout = timeoutMs + (attempt - 1) * 1000; // 4.0s, 5.0s
        // Tenta em paralelo: invocação via SDK e chamada HTTP direta
        const sdkInvoke = (async () => {
          const result = await supabase.functions.invoke(functionName, { body });
          const data = (result as { data?: unknown; error?: unknown }).data;
          const err = (result as { data?: unknown; error?: unknown }).error;
          if (err) throw err as Error;
          return data;
        })();

        const httpInvoke = (async () => {
          const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
          const url = `${baseUrl}/functions/v1/${functionName}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey,
            },
            body: JSON.stringify(body ?? {}),
          });
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text}`);
          }
          return await resp.json();
        })();

        const winner = await Promise.race([
          Promise.any([sdkInvoke, httpInvoke]),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Edge Function timeout after ${attemptTimeout}ms`)), attemptTimeout))
        ]);

        console.log(`✅ [ROBUST_ADMIN] Edge Function sucesso (tentativa ${attempt}):`, winner);
        return { success: true, data: winner };
      } catch (error: unknown) {
        console.error(`💥 [ROBUST_ADMIN] Exceção na Edge Function (tentativa ${attempt}):`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000;
          console.log(`⏳ [ROBUST_ADMIN] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`❌ [ROBUST_ADMIN] Edge Function falhou após ${maxRetries} tentativas:`, lastError);
    const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'Edge Function failed after retries');
    return { success: false, error: message };
  }

  static async listUsers(): Promise<{ success: boolean; data: Profile[]; error?: string }> {
    console.log('🚀 [ROBUST_ADMIN] Iniciando listUsers com execução concorrente e timeouts curtos...');

    // Executa todas as estratégias em paralelo e retorna a primeira que tiver sucesso
    const edgeTask = (async () => {
      console.log('📞 [ROBUST_ADMIN] Estratégia: Edge Function admin-list-users');
      const edgeResult = await this.tryEdgeFunction('admin-list-users', {}, 2, 3500);
      if (edgeResult.success && edgeResult.data) {
        const payload = edgeResult.data as unknown;
        if (payload && typeof payload === 'object' && 'profiles' in payload) {
          const profiles = (payload as { profiles: Profile[] }).profiles;
          console.log('✅ [ROBUST_ADMIN] Edge Function retornou', profiles.length, 'usuários');
          return profiles;
        }
      }
      throw new Error(edgeResult.error || 'Edge Function falhou');
    })();

    const restTask = (async () => {
      console.log('🔄 [ROBUST_ADMIN] Estratégia: API REST com chave anon');
      const apiResult = await SupabaseAdminAPI.listUsers();
      if (apiResult.success && Array.isArray(apiResult.data)) {
        console.log('✅ [ROBUST_ADMIN] API REST retornou', apiResult.data.length, 'usuários');
        return apiResult.data;
      }
      throw new Error(apiResult.error || 'API REST falhou');
    })();

    const directTask = (async () => {
      console.log('🔄 [ROBUST_ADMIN] Estratégia: Consulta direta via cliente Supabase');
      const { data: directData, error: directError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('email', { ascending: true });
      if (!directError && Array.isArray(directData)) {
        const typed = directData as unknown as Profile[];
        console.log('✅ [ROBUST_ADMIN] Consulta direta retornou', typed.length, 'usuários');
        return typed;
      }
      throw new Error(directError?.message || 'Consulta direta falhou');
    })();

    const withTimeout = <T>(p: Promise<T>, ms: number, label: string) =>
      Promise.race<T>([
        p,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout após ${ms}ms`)), ms))
      ]);

    // Primeiro, tente obter um resultado NÃO VAZIO de qualquer estratégia
    const strictCandidates = [
      withTimeout(edgeTask.then((d) => d.length > 0 ? d : Promise.reject(new Error('Edge retornou lista vazia'))), 5000, 'Edge Function'),
      withTimeout(directTask.then((d) => d.length > 0 ? d : Promise.reject(new Error('Consulta direta retornou lista vazia'))), 2500, 'Consulta direta'),
      withTimeout(restTask.then((d) => d.length > 0 ? d : Promise.reject(new Error('API REST retornou lista vazia'))), 2500, 'API REST'),
    ];

    // Candidatos padrão (podem retornar vazio). Preferir Edge > Direto > REST se todos forem vazios
    const normalCandidates = [
      withTimeout(edgeTask, 5000, 'Edge Function'),
      withTimeout(directTask, 2500, 'Consulta direta'),
      withTimeout(restTask, 2500, 'API REST'),
    ];

    try {
      // Tenta primeiro qualquer resultado com dados
      const data = await Promise.any(strictCandidates);
      return { success: true, data };
    } catch (err) {
      console.warn('⚠️ [ROBUST_ADMIN] Nenhum resultado com dados. Tentando fallback com qualquer sucesso (possivelmente vazio)...', err);
      const settled = await Promise.allSettled(normalCandidates);

      // Preferir Edge > Direto > REST
      for (const s of settled) {
        if (s.status === 'fulfilled' && Array.isArray(s.value)) {
          return { success: true, data: s.value };
        }
      }

      console.error('❌ [ROBUST_ADMIN] Todas as estratégias falharam ou expiraram:', settled);
      return {
        success: false,
        error: (err instanceof Error ? err.message : String(err)) || 'Falha geral ao listar usuários',
        data: [],
      };
    }
  }

  static async updateRole(userId: string, newRole: Role): Promise<{ ok: boolean; error?: string }> {
    console.log(`🚀 [ROBUST_ADMIN] Atualizando papel: ${userId} -> ${newRole}`);
    
    // Estratégia 1: Edge Function (se existir)
    const edgeResult = await this.tryEdgeFunction('admin-update-role', { userId, newRole });
    
    if (edgeResult.success) {
      console.log('✅ [ROBUST_ADMIN] Papel atualizado via Edge Function');
      return { ok: true };
    }
    
    // Estratégia 2: API REST
    console.log('🔄 [ROBUST_ADMIN] Fallback para API REST');
    return await SupabaseAdminAPI.updateRole(userId, newRole);
  }

  static async deleteUser(userId: string): Promise<{ ok: boolean; warning?: string; error?: string }> {
    console.log(`🚀 [ROBUST_ADMIN] Excluindo usuário: ${userId}`);
    
    // Estratégia 1: Edge Function com timeout mais longo e retry
    console.log('📞 [ROBUST_ADMIN] Tentando Edge Function admin-delete-user...');
    const edgeResult = await this.tryEdgeFunction('admin-delete-user', { userId }, 3, 8000);
    
    if (edgeResult.success) {
      console.log('✅ [ROBUST_ADMIN] Usuário excluído via Edge Function');
      const data = edgeResult.data as { ok?: boolean; warning?: string } | null;
      return { 
        ok: true, 
        warning: data?.warning 
      };
    }
    
    console.warn('⚠️ [ROBUST_ADMIN] Edge Function falhou:', edgeResult.error);
    
    // Estratégia 2: Tentar exclusão direta usando service_role se disponível
    console.log('🔄 [ROBUST_ADMIN] Tentando exclusão direta com service_role...');
    try {
      const serviceRoleKey = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          serviceRoleKey
        );
        
        // Excluir da autenticação primeiro
        const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
        if (authError) {
          console.error('❌ [ROBUST_ADMIN] Erro ao excluir da autenticação:', authError);
        } else {
          console.log('✅ [ROBUST_ADMIN] Usuário excluído da autenticação');
        }
        
        // Excluir do perfil
        const { error: profileError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileError) {
          console.warn('⚠️ [ROBUST_ADMIN] Erro ao excluir perfil:', profileError);
          return { 
            ok: true, 
            warning: authError ? 
              'Usuário removido do perfil, mas permanece na autenticação' : 
              'Usuário excluído da autenticação, mas erro ao remover perfil'
          };
        }
        
        console.log('✅ [ROBUST_ADMIN] Usuário excluído completamente via service_role');
        return { ok: true };
      }
    } catch (error) {
      console.error('❌ [ROBUST_ADMIN] Erro na exclusão direta:', error);
    }
    
    // Estratégia 3: API REST (fallback final)
    console.log('🔄 [ROBUST_ADMIN] Fallback final para API REST');
    return await SupabaseAdminAPI.deleteUser(userId);
  }
}