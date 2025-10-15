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
      
      console.warn('⚠️ [USER_EDIT] Edge Function falhou, tentando atualização direta:', fnError);
      
    } catch (fnError: unknown) {
      const msg = fnError instanceof Error ? fnError.message : String(fnError);
      console.warn('💥 [USER_EDIT] Erro na Edge Function:', msg);
    }
    
    // Fallback: atualização direta na tabela profiles
    console.log('🔄 [USER_EDIT] Tentando atualização direta na tabela profiles...');
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: params.newRole, updated_at: new Date().toISOString() })
      .eq('id', params.userId);
    
    if (updateError) {
      console.error('❌ [USER_EDIT] Erro na atualização direta:', updateError);
      return {
        success: false,
        error: `Erro ao atualizar papel: ${updateError.message}`,
        strategy: 'direct-update'
      };
    }
    
    console.log('✅ [USER_EDIT] Papel atualizado via atualização direta');
    return {
      success: true,
      strategy: 'direct-update'
    };
    
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
    
    // Tentar via Edge Function
    try {
      console.log('📞 [USER_EDIT] Tentando atualizar senha via Edge Function...');
      
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-update-password', {
        body: { userId: params.userId, password: params.newPassword }
      });
      
      console.log('📋 [USER_EDIT] Resposta da Edge Function:', { fnData, fnError });
      
      const ok = (fnData as { ok?: boolean } | null)?.ok;
      if (!fnError && ok) {
        console.log('✅ [USER_EDIT] Senha atualizada via Edge Function');
        return {
          success: true,
          strategy: 'edge-function'
        };
      }
      
      console.warn('⚠️ [USER_EDIT] Edge Function falhou:', fnError);
      return {
        success: false,
        error: fnError?.message || 'Erro na Edge Function para atualização de senha',
        strategy: 'edge-function'
      };
      
    } catch (fnError: unknown) {
      const msg = fnError instanceof Error ? fnError.message : String(fnError);
      console.error('💥 [USER_EDIT] Erro na Edge Function:', msg);
      return {
        success: false,
        error: `Erro na comunicação com Edge Function: ${msg}`,
        strategy: 'edge-function'
      };
    }

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
    
    // Verificar se todas as operações foram bem-sucedidas
    const failures = results.filter(r => !r.success);
    const warnings = results.filter(r => r.warning).map(r => r.warning);
    
    if (failures.length > 0) {
      const errors = failures.map(f => f.error).join('; ');
      return {
        success: false,
        error: `Algumas atualizações falharam: ${errors}`,
        warning: warnings.length > 0 ? warnings.join('; ') : undefined
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