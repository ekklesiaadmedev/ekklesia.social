/**
 * Script de debug para testar validação de email
 * Foco: "painel@ekklesia.com" sendo rejeitado incorretamente
 */

// Simular as funções de validação
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email
    // Remove apenas caracteres de controle e zero-width (NÃO remove caracteres válidos)
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    // Remove espaços no início e fim
    .trim()
    // Remove espaços ao redor do @ (mas mantém espaços válidos em outras posições)
    .replace(/\s*@\s*/g, '@');
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    console.log('❌ FALHA: Email não é string válida');
    return false;
  }

  const sanitized = sanitizeEmail(email);
  console.log('🧹 Email sanitizado:', sanitized);
  
  // Verificações MÍNIMAS - apenas o essencial
  if (sanitized.length === 0) {
    console.log('❌ FALHA: Email vazio após sanitização');
    return false;
  }
  if (sanitized.length > 320) {
    console.log('❌ FALHA: Email muito longo');
    return false;
  }
  if (!sanitized.includes('@')) {
    console.log('❌ FALHA: Email não contém @');
    return false;
  }
  if (sanitized.startsWith('@') || sanitized.endsWith('@')) {
    console.log('❌ FALHA: Email começa ou termina com @');
    return false;
  }
  if (sanitized.includes('@@')) {
    console.log('❌ FALHA: Email contém @@');
    return false;
  }

  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    console.log('❌ FALHA: Email não tem exatamente 2 partes separadas por @');
    return false;
  }

  const [localPart, domainPart] = parts;
  console.log('📧 Partes do email:', { localPart, domainPart });
  
  // Validação MÍNIMA da parte local (antes do @)
  if (localPart.length === 0 || localPart.length > 64) {
    console.log('❌ FALHA: Parte local inválida (tamanho)');
    return false;
  }

  // Validação MÍNIMA do domínio (depois do @)
  if (domainPart.length === 0 || domainPart.length > 253) {
    console.log('❌ FALHA: Domínio inválido (tamanho)');
    return false;
  }
  if (!domainPart.includes('.')) {
    console.log('❌ FALHA: Domínio não contém ponto');
    return false;
  }

  // Regex MUITO PERMISSIVO - aceita praticamente qualquer caractere comum
  const localPartRegex = /^[a-zA-Z0-9._%+\-@!#$&'*+=?^`{|}~]+$/;
  const domainPartRegex = /^[a-zA-Z0-9.\-]+$/;

  // Validação permissiva - só rejeita se claramente inválido
  if (localPart.length > 0 && !localPartRegex.test(localPart)) {
    console.log('❌ FALHA: Local part rejeitada pela regex:', localPart);
    console.log('🔍 Regex local:', localPartRegex.toString());
    return false;
  }
  if (domainPart.length > 0 && !domainPartRegex.test(domainPart)) {
    console.log('❌ FALHA: Domain part rejeitado pela regex:', domainPart);
    console.log('🔍 Regex domain:', domainPartRegex.toString());
    return false;
  }

  // Verificação MÍNIMA do TLD - apenas que existe e tem pelo menos 2 caracteres
  const domainParts = domainPart.split('.');
  const tld = domainParts[domainParts.length - 1];
  console.log('🌐 TLD encontrado:', tld);
  if (tld.length < 2) {
    console.log('❌ FALHA: TLD muito curto');
    return false;
  }

  console.log('✅ Email válido!');
  return true;
}

function validateAndNormalizeEmail(email) {
  const originalEmail = email || '';
  const sanitizedEmail = sanitizeEmail(originalEmail);
  const errors = [];

  console.log('🔍 TESTE COMPLETO:', { originalEmail, sanitizedEmail });

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

  return {
    isValid,
    originalEmail,
    sanitizedEmail,
    errors
  };
}

// TESTE PRINCIPAL
console.log('🚀 INICIANDO TESTE DE DEBUG');
console.log('=' .repeat(50));

const testEmail = 'painel@ekklesia.com';
console.log('📧 Testando email:', testEmail);
console.log('-'.repeat(30));

const result = validateAndNormalizeEmail(testEmail);
console.log('📋 RESULTADO FINAL:', result);

console.log('=' .repeat(50));
console.log('🏁 TESTE CONCLUÍDO');