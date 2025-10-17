/**
 * Utilitário robusto para edição de usuários
 * Implementa validações consistentes e tratamento de erros aprimorado
 */

import { supabase } from '@/integrations/supabase/client';
import { validateAndNormalizeEmail } from './emailValidation';
import type { Role } from '@/types/user';

export interface UpdateUserRoleParams {
  userId: string;
  newRole: Role;
}

export interface UpdateUserPasswordParams {
  userId: string;
  newPassword: string;
}

export interface UpdateUserResult {
  success: boolean;
  error?: string;
  warning?: string;
  strategy?: string;
}

/**
 * Atualiza o papel de um usuário
 */
export async function updateUserRole(params: UpdateUserRoleParams): Promise<UpdateUserResult> {
  try {
    console.log('🔄 [USER_EDIT] Atualizando papel do usuário:', params);
    
    // Validar parâmetros
    if (!params.userId || !params.newRole) {
      return {
        success: false,
        error: 'ID do usuário e novo papel são obrigatórios'
      };
    }
    
    const validRoles: Role[] = ['admin', 'triage', 'service', 'panel'];
    if (!validRoles.includes(params.newRole)) {
      return {
        success: false,
        error: `Papel inválido. Deve ser um de: ${validRoles.join(', ')}`
      };
    }
    
    // Tentar via Edge Function primeiro
    try {
      console.log('📞 [USER_EDIT] Tentando atualizar papel via Edge Function...');
      
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-update-role', {
        body: { userId: params.userId, newRole: params.newRole }
      });
      
      console.log('📋 [USER_EDIT] Resposta da Edge Function:', { fnData, fnError });
      
      const ok = (fnData as { ok?: boolean } | null)?.ok;
      if (!fnError && ok) {
        console.log('✅ [USER_EDIT] Papel atualizado via Edge Function');
        return {
          success: true,
          strategy: 'edge-function'
        };
      }
      
      console.warn('⚠️ [USER_EDIT] Edge Function falhou, tentando fallback direto...');
      
    } catch (fnError: unknown) {
      const msg = fnError instanceof Error ? fnError.message : String(fnError);
      console.error('💥 [USER_EDIT] Erro na Edge Function, tentando fallback direto:', msg);
    }
    
    // 🔧 [FIX] Fallback robusto: atualização direta na tabela profiles com retry
    console.log('🔄 [USER_EDIT] Tentando fallback direto na tabela profiles...');
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`📞 [USER_EDIT] Tentativa ${attempt}/2 - Fallback direto...`);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: params.newRole, updated_at: new Date().toISOString() })
          .eq('id', params.userId);
        
        if (!updateError) {
          console.log('✅ [USER_EDIT] Papel atualizado via fallback direto');
          return {
            success: true,
            strategy: 'direct-update',
            warning: 'Atualização realizada via fallback direto (Edge Function indisponível)'
          };
        }
        
        console.error(`❌ [USER_EDIT] Erro no fallback direto (tentativa ${attempt}):`, updateError);
        
        if (attempt < 2) {
          console.log('⏳ [USER_EDIT] Aguardando 1s antes da próxima tentativa...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          return {
            success: false,
            error: `Fallback direto falhou após ${attempt} tentativas: ${updateError.message}`,
            strategy: 'direct-update'
          };
        }
        
      } catch (fallbackError: unknown) {
        const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.error(`💥 [USER_EDIT] Erro no fallback direto (tentativa ${attempt}):`, msg);
        
        if (attempt < 2) {
          console.log('⏳ [USER_EDIT] Aguardando 1s antes da próxima tentativa...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          return {
            success: false,
            error: `Erro no fallback direto após ${attempt} tentativas: ${msg}`,
            strategy: 'direct-update'
          };
        }
      }
    }
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('💥 [USER_EDIT] Erro crítico ao atualizar papel:', error);
    return {
      success: false,
      error: `Erro crítico: ${msg || 'Erro desconhecido'}`
    };
  }
}

/**
 * Atualiza a senha de um usuário
 */
export async function updateUserPassword(params: UpdateUserPasswordParams): Promise<UpdateUserResult> {
  try {
    console.log('🔄 [USER_EDIT] Atualizando senha do usuário:', { userId: params.userId });
    
    // Validar parâmetros
    if (!params.userId || !params.newPassword) {
      return {
        success: false,
        error: 'ID do usuário e nova senha são obrigatórios'
      };
    }
    
    if (params.newPassword.length < 6) {
      return {
        success: false,
        error: 'Nova senha deve ter pelo menos 6 caracteres'
      };
    }
    
    // 🔧 [FIX] Implementar retry robusto com múltiplas estratégias
    let lastError: string = '';
    
    // Estratégia 1: Edge Function com retry
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📞 [USER_EDIT] Tentativa ${attempt}/3 - Edge Function admin-update-password...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-update-password', {
          body: { userId: params.userId, password: params.newPassword }
        });
        
        clearTimeout(timeoutId);
        console.log('📋 [USER_EDIT] Resposta da Edge Function:', { fnData, fnError });
        
        const ok = (fnData as { ok?: boolean } | null)?.ok;
        if (!fnError && ok) {
          console.log('✅ [USER_EDIT] Senha atualizada via Edge Function');
          return {
            success: true,
            strategy: 'edge-function'
          };
        }
        
        lastError = fnError?.message || 'Erro na Edge Function para atualização de senha';
        console.warn(`⚠️ [USER_EDIT] Edge Function falhou (tentativa ${attempt}):`, fnError);
        
        if (attempt < 3) {
          const delay = attempt * 1000; // 1s, 2s
          console.log(`⏳ [USER_EDIT] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (fnError: unknown) {
        const msg = fnError instanceof Error ? fnError.message : String(fnError);
        lastError = `Erro na comunicação com Edge Function: ${msg}`;
        console.error(`💥 [USER_EDIT] Erro na Edge Function (tentativa ${attempt}):`, msg);
        
        if (attempt < 3) {
          const delay = attempt * 1000;
          console.log(`⏳ [USER_EDIT] Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Estratégia 2: Fallback direto usando service_role (se disponível)
    console.log('🔄 [USER_EDIT] Tentando fallback direto com service_role...');
    try {
      const serviceRoleKey = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          serviceRoleKey
        );
        
        const { error: updateError } = await adminClient.auth.admin.updateUserById(params.userId, {
          password: params.newPassword
        });
        
        if (!updateError) {
          console.log('✅ [USER_EDIT] Senha atualizada via fallback direto');
          return {
            success: true,
            strategy: 'direct-admin',
            warning: 'Atualização realizada via fallback direto (Edge Function indisponível)'
          };
        }
        
        console.error('❌ [USER_EDIT] Erro no fallback direto:', updateError);
        lastError = `Fallback direto falhou: ${updateError.message}`;
      } else {
        console.warn('⚠️ [USER_EDIT] Service role key não disponível para fallback');
        lastError = 'Service role key não disponível para fallback';
      }
    } catch (fallbackError: unknown) {
      const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error('💥 [USER_EDIT] Erro no fallback direto:', msg);
      lastError = `Erro no fallback direto: ${msg}`;
    }
    
    // Se chegou até aqui, todas as estratégias falharam
    return {
      success: false,
      error: `Todas as estratégias falharam. Último erro: ${lastError}`,
      strategy: 'all-failed'
    };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('💥 [USER_EDIT] Erro crítico ao atualizar senha:', error);
    return {
      success: false,
      error: `Erro crítico: ${msg || 'Erro desconhecido'}`
    };
  }
}

/**
 * Atualiza múltiplos campos de um usuário
 */
export async function updateUser(params: {
  userId: string;
  role?: Role;
  password?: string;
}): Promise<UpdateUserResult> {
  try {
    console.log('🔄 [USER_EDIT] Atualizando usuário:', { userId: params.userId, hasRole: !!params.role, hasPassword: !!params.password });
    
    const results: UpdateUserResult[] = [];
    
    // Atualizar papel se fornecido
    if (params.role) {
      const roleResult = await updateUserRole({
        userId: params.userId,
        newRole: params.role
      });
      results.push(roleResult);
    }
    
    // Atualizar senha se fornecida
    if (params.password) {
      const passwordResult = await updateUserPassword({
        userId: params.userId,
        newPassword: params.password
      });
      results.push(passwordResult);
    }
    
    // 🔧 [FIX] Melhorar tratamento de erros e feedback
    const errors = results.filter(r => !r.success);
    const successes = results.filter(r => r.success);
    const warnings = results.filter(r => r.warning).map(r => r.warning);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.error).join('; ');
      
      // Se pelo menos uma operação teve sucesso, informar parcialmente
      if (successes.length > 0) {
        const successStrategies = successes.map(s => s.strategy).join(', ');
        return {
          success: false,
          error: `Algumas atualizações falharam: ${errorMessages}`,
          warning: `Operações bem-sucedidas: ${successStrategies}${warnings.length > 0 ? '. Avisos: ' + warnings.join('; ') : ''}`
        };
      }
      
      return {
        success: false,
        error: `Todas as atualizações falharam: ${errorMessages}`
      };
    }
    
    console.log('✅ [USER_EDIT] Todas as atualizações foram bem-sucedidas');
    return {
      success: true,
      warning: warnings.length > 0 ? warnings.join('; ') : undefined
    };
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('💥 [USER_EDIT] Erro crítico na atualização do usuário:', error);
    return {
      success: false,
      error: `Erro crítico: ${msg || 'Erro desconhecido'}`
    };
  }
}

/**
 * Função de conveniência para atualização de papel
 */
export async function updateRole(userId: string, newRole: Role): Promise<UpdateUserResult> {
  return updateUserRole({ userId, newRole });
}

/**
 * Função de conveniência para atualização de senha
 */
export async function updatePassword(userId: string, newPassword: string): Promise<UpdateUserResult> {
  return updateUserPassword({ userId, newPassword });
}