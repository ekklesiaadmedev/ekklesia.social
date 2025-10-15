/**
 * Utilitário robusto para validação e sanitização de emails
 * Projetado para ser MUITO PERMISSIVO com emails válidos e rigoroso apenas com formatos claramente inválidos
 * CORRIGE O PROBLEMA: "Email address 'painel@ekklesia.com' is invalid"
 */

/**
 * Sanitiza um email removendo apenas caracteres claramente problemáticos
 * Mantém a integridade de emails válidos como "painel@ekklesia.com"
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Remove caracteres de controle e zero-width sem usar regex com controles,
  // evitando o warning do lint (no-control-regex)
  const removeInvisibleChars = (str: string): string => {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      const isControl = (code >= 0 && code <= 31) || code === 127;
      const isZeroWidth = (code >= 0x200B && code <= 0x200D) || code === 0xFEFF;
      if (!isControl && !isZeroWidth) out += str[i];
    }
    return out;
  };

  return removeInvisibleChars(email)
    // Remove espaços no início e fim
    .trim()
    // Remove espaços ao redor do @ (mas mantém espaços válidos em outras posições)
    .replace(/\s*@\s*/g, '@');
}

/**
 * Valida se um email tem formato válido
 * MUITO PERMISSIVO - aceita praticamente qualquer email que segue o padrão básico
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const sanitized = sanitizeEmail(email);
  
  // Verificações MÍNIMAS - apenas o essencial
  if (sanitized.length === 0) return false;
  if (sanitized.length > 320) return false; // Limite mais generoso
  if (!sanitized.includes('@')) return false;
  if (sanitized.startsWith('@') || sanitized.endsWith('@')) return false;
  if (sanitized.includes('@@')) return false;

  const parts = sanitized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  
  // Validação MÍNIMA da parte local (antes do @)
  if (localPart.length === 0 || localPart.length > 64) return false;
  // Removido: validações restritivas de pontos consecutivos

  // Validação MÍNIMA do domínio (depois do @)
  if (domainPart.length === 0 || domainPart.length > 253) return false;
  if (!domainPart.includes('.')) return false;
  // Removido: validações restritivas de pontos no início/fim

  // Regex MUITO PERMISSIVO - aceita praticamente qualquer caractere comum
  // Inclui letras, números, pontos, hífens, underscores e caracteres especiais
  // Ajuste: coloca o hífen no fim da classe para evitar escapes desnecessários
  const localPartRegex = /^[a-zA-Z0-9._%+@!#$&'*+=?^`{|}~-]+$/;
  const domainPartRegex = /^[a-zA-Z0-9.-]+$/;

  // Validação permissiva - só rejeita se claramente inválido
  if (localPart.length > 0 && !localPartRegex.test(localPart)) {
    console.log('🔍 [EMAIL_VALIDATION] Local part rejeitada:', localPart);
    return false;
  }
  if (domainPart.length > 0 && !domainPartRegex.test(domainPart)) {
    console.log('🔍 [EMAIL_VALIDATION] Domain part rejeitado:', domainPart);
    return false;
  }

  // Verificação MÍNIMA do TLD - apenas que existe e tem pelo menos 2 caracteres
  const domainParts = domainPart.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  // Removido: validação restritiva de apenas letras no TLD

  console.log('✅ [EMAIL_VALIDATION] Email válido:', sanitized);
  return true;
}

/**
 * Normaliza um email para formato padrão (lowercase, sanitizado)
 * Mantém a estrutura original do email
 */
export function normalizeEmail(email: string): string {
  const sanitized = sanitizeEmail(email);
  if (!isValidEmail(sanitized)) {
    return sanitized; // Retorna sanitizado mesmo se inválido para debugging
  }
  
  // Converte apenas o domínio para lowercase (RFC recomenda)
  const [localPart, domainPart] = sanitized.split('@');
  return `${localPart}@${domainPart.toLowerCase()}`;
}

/**
 * Valida e normaliza um email, retornando resultado detalhado
 */
export function validateAndNormalizeEmail(email: string): {
  isValid: boolean;
  normalizedEmail: string;
  originalEmail: string;
  sanitizedEmail: string;
  errors: string[];
} {
  const originalEmail = email || '';
  const sanitizedEmail = sanitizeEmail(originalEmail);
  const errors: string[] = [];

  // Verificações detalhadas para mensagens de erro específicas
  if (!originalEmail) {
    errors.push('Email é obrigatório');
  } else if (originalEmail !== sanitizedEmail) {
    console.log('📧 Email sanitizado:', { original: originalEmail, sanitized: sanitizedEmail });
  }

  if (sanitizedEmail.length === 0) {
    errors.push('Email não pode estar vazio');
  } else if (sanitizedEmail.length > 254) {
    errors.push('Email muito longo (máximo 254 caracteres)');
  } else if (!sanitizedEmail.includes('@')) {
    errors.push('Email deve conter @');
  } else if (sanitizedEmail.split('@').length !== 2) {
    errors.push('Email deve conter exatamente um @');
  } else {
    const [localPart, domainPart] = sanitizedEmail.split('@');
    
    if (localPart.length === 0) {
      errors.push('Parte antes do @ não pode estar vazia');
    } else if (localPart.length > 64) {
      errors.push('Parte antes do @ muito longa (máximo 64 caracteres)');
    }
    
    if (domainPart.length === 0) {
      errors.push('Domínio não pode estar vazio');
    } else if (!domainPart.includes('.')) {
      errors.push('Domínio deve conter pelo menos um ponto');
    } else {
      const domainParts = domainPart.split('.');
      const tld = domainParts[domainParts.length - 1];
      if (tld.length < 2) {
        errors.push('Extensão do domínio muito curta');
      }
    }
  }

  const isValid = errors.length === 0 && isValidEmail(sanitizedEmail);
  const normalizedEmail = isValid ? normalizeEmail(sanitizedEmail) : sanitizedEmail;

  return {
    isValid,
    normalizedEmail,
    originalEmail,
    sanitizedEmail,
    errors
  };
}

/**
 * Função de conveniência para validação rápida
 */
export function quickValidateEmail(email: string): { isValid: boolean; email: string; error?: string } {
  const result = validateAndNormalizeEmail(email);
  return {
    isValid: result.isValid,
    email: result.normalizedEmail,
    error: result.errors.length > 0 ? result.errors[0] : undefined
  };
}