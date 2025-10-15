/**
 * Utilitário robusto para criação de usuários
 * Implementa múltiplas estratégias de fallback e retry automático
 */

import { supabase } from '@/integrations/supabase/client';
import { validateAndNormalizeEmail } from './emailValidation';
import type { Role } from '@/types/user';

export interface CreateUserParams {
  email: string;
  password: string;
  fullName?: string;
  role?: Role;
}

export interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
  warning?: string;
  strategy?: string;
  attempts?: number;
}

/**
 * Estratégia 1: Edge Function admin-create-user
 */
async function createUserViaEdgeFunction(params: CreateUserParams): Promise<CreateUserResult> {
  try {
    console.log('📞 [USER_CREATION] Tentativa via Edge Function admin-create-user...');
    
    // Primeiro, verificar se o usuário já existe
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && existingUsers?.users) {
      const existingUser = existingUsers.users.find(u => u.email === params.email);
      if (existingUser) {
        console.log('⚠️ [USER_CREATION] Usuário já existe:', params.email);
        return {
          success: false,
          error: `Usuário com email "${params.email}" já existe no sistema`,
          strategy: 'edge-function'
        };
      }
    }
    
    const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: { 
        email: params.email, 
        password: params.password, 
        full_name: params.fullName, 
        role: params.role 
      }
    });
    
    console.log('📋 [USER_CREATION] Resposta da Edge Function:', { fnData, fnError });
    
    if (fnError) {
      // Tratar erro específico de email já existente
      if (fnError.message && fnError.message.includes('email_exists')) {
        return {
          success: false,
          error: `Usuário com email "${params.email}" já existe no sistema`,
          strategy: 'edge-function'
        };
      }
      
      return {
        success: false,
        error: fnError.message || 'Erro na Edge Function',
        strategy: 'edge-function'
      };
    }
    
    const result = fnData as { ok?: boolean; userId?: string; warning?: string } | null;
    if (result && result.ok && result.userId) {
      return {
        success: true,
        userId: result.userId,
        warning: result.warning,
        strategy: 'edge-function'
      };
    }
    
    return {
      success: false,
      error: 'Edge Function não retornou userId válido',
      strategy: 'edge-function'
    };
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('💥 [USER_CREATION] Erro na Edge Function:', error);
    
    // Tratar erro específico de email já existente
    if (msg.includes('email_exists') || msg.includes('already been registered')) {
      return {
        success: false,
        error: `Usuário com email "${params.email}" já existe no sistema`,
        strategy: 'edge-function'
      };
    }
    
    return {
      success: false,
      error: msg || 'Falha na comunicação com Edge Function',
      strategy: 'edge-function'
    };
  }
}

/**
 * Estratégia 2: signUp padrão do Supabase
 */
async function createUserViaSignUp(params: CreateUserParams): Promise<CreateUserResult> {
  try {
    console.log('🔄 [USER_CREATION] Tentativa via signUp padrão...');
    
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { 
        data: params.fullName ? { full_name: params.fullName } : undefined 
      }
    });
    
    console.log('📋 [USER_CREATION] Resposta do signUp:', { data, error });
    
    if (error) {
      return {
        success: false,
        error: error.message,
        strategy: 'signup'
      };
    }
    
    const newUserId = data.user?.id;
    if (!newUserId) {
      return {
        success: false,
        error: 'signUp não retornou userId válido',
        strategy: 'signup'
      };
    }
    
    // Tentar atualizar perfil
    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ 
          id: newUserId, 
          email: params.email, 
          full_name: params.fullName, 
          role: params.role || 'service' 
        }, { onConflict: 'id' });
        
      if (upsertError) {
        console.warn('⚠️ [USER_CREATION] Erro ao atualizar perfil:', upsertError);
        return {
          success: true,
          userId: newUserId,
          warning: `Usuário criado, mas perfil não atualizado: ${upsertError.message}`,
          strategy: 'signup'
        };
      }
      
      return {
        success: true,
        userId: newUserId,
        strategy: 'signup'
      };
      
    } catch (profileError: unknown) {
      const msg = profileError instanceof Error ? profileError.message : String(profileError);
      console.warn('⚠️ [USER_CREATION] Erro ao atualizar perfil:', profileError);
      return {
        success: true,
        userId: newUserId,
        warning: `Usuário criado, mas perfil não atualizado: ${msg}`,
        strategy: 'signup'
      };
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('💥 [USER_CREATION] Erro no signUp:', error);
    return {
      success: false,
      error: msg || 'Falha no signUp',
      strategy: 'signup'
    };
  }
}

/**
 * Estratégia 3: Fallback via API REST (se disponível)
 */
async function createUserViaRestAPI(params: CreateUserParams): Promise<CreateUserResult> {
  try {
    console.log('🔧 [USER_CREATION] Tentativa via API REST...');
    
    // Esta estratégia pode ser implementada se necessário
    // Por enquanto, retorna erro para indicar que não está disponível
    return {
      success: false,
      error: 'API REST não implementada para criação de usuários',
      strategy: 'rest-api'
    };
    
  } catch (error: unknown) {
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || 'Falha na API REST',
      strategy: 'rest-api'
    };
  }
}

/**
 * Função principal para criação robusta de usuários
 * Implementa múltiplas estratégias com retry automático
 */
export async function createUserRobust(params: CreateUserParams): Promise<CreateUserResult> {
  console.log('🚀 [USER_CREATION] Iniciando criação robusta de usuário:', {
    email: params.email,
    fullName: params.fullName,
    role: params.role
  });
  
  // Validar email primeiro
  const emailValidation = validateAndNormalizeEmail(params.email);
  if (!emailValidation.isValid) {
    return {
      success: false,
      error: `Email inválido: ${emailValidation.errors[0] || 'Formato incorreto'}`,
      strategy: 'validation'
    };
  }
  
  // Usar email normalizado
  const normalizedParams = {
    ...params,
    email: emailValidation.normalizedEmail
  };
  
  // Estratégias em ordem de preferência
  const strategies = [
    createUserViaEdgeFunction,
    createUserViaSignUp,
    // createUserViaRestAPI // Desabilitado por enquanto
  ];
  
  let lastError = '';
  let attempts = 0;
  
  for (const strategy of strategies) {
    attempts++;
    const result = await strategy(normalizedParams);
    
    if (result.success) {
      console.log('✅ [USER_CREATION] Usuário criado com sucesso:', {
        strategy: result.strategy,
        userId: result.userId,
        attempts,
        warning: result.warning
      });
      
      return {
        ...result,
        attempts
      };
    }
    
    lastError = result.error || 'Erro desconhecido';
    console.warn(`⚠️ [USER_CREATION] Estratégia ${result.strategy} falhou:`, result.error);
  }
  
  console.error('❌ [USER_CREATION] Todas as estratégias falharam:', {
    lastError,
    attempts,
    email: normalizedParams.email
  });
  
  return {
    success: false,
    error: `Falha em todas as estratégias. Último erro: ${lastError}`,
    attempts
  };
}

/**
 * Função de conveniência para criação simples
 */
export async function createUser(
  email: string, 
  password: string, 
  fullName?: string, 
  role?: Role
): Promise<CreateUserResult> {
  return createUserRobust({ email, password, fullName, role });
}