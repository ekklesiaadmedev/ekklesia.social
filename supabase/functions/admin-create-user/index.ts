import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  email: string;
  password: string;
  full_name?: string;
  role?: "admin" | "triage" | "service" | "panel";
};

// Validação de email MUITO PERMISSIVA para contornar limitações do Supabase Auth
function isValidEmailPermissive(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const sanitized = email.trim();
  if (sanitized.length === 0 || sanitized.length > 320) return false;
  if (!sanitized.includes('@')) return false;
  if (sanitized.startsWith('@') || sanitized.endsWith('@')) return false;
  if (sanitized.includes('@@')) return false;

  const parts = sanitized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (domainPart.length === 0 || domainPart.length > 253) return false;
  if (!domainPart.includes('.')) return false;

  // Regex MUITO PERMISSIVO
  const localPartRegex = /^[a-zA-Z0-9._%+@!#$&'*+=?^`{|}~-]+$/;
  const domainPartRegex = /^[a-zA-Z0-9.-]+$/;

  if (!localPartRegex.test(localPart) || !domainPartRegex.test(domainPart)) return false;

  const domainParts = domainPart.split('.');
  const tld = domainParts[domainParts.length - 1];
  return tld.length >= 2;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.log(`❌ [EDGE_FUNCTION] Missing environment variables - URL: ${!!url}, ServiceKey: ${!!serviceKey}`);
    return new Response(JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { status: 500 });
  }

  let body: Body | null = null;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400 });
  }

  const { email, password, full_name, role } = body || ({} as Body);
  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, error: "Missing email or password" }), { status: 400 });
  }

  // Validação permissiva do email ANTES de tentar criar no Supabase Auth
  if (!isValidEmailPermissive(email)) {
    console.log(`❌ [EDGE_FUNCTION] Email rejeitado pela validação permissiva: ${email}`);
    return new Response(JSON.stringify({ ok: false, error: `Email format invalid: ${email}` }), { status: 400 });
  }

  console.log(`✅ [EDGE_FUNCTION] Email aprovado pela validação permissiva: ${email}`);

  const supabase = createClient(url, serviceKey);

  // Create user in Auth with email confirmation disabled
  console.log(`🔄 [EDGE_FUNCTION] Tentando criar usuário no Supabase Auth: ${email}`);
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : undefined,
  });
  
  if (createError) {
    console.log(`❌ [EDGE_FUNCTION] Erro do Supabase Auth: ${createError.message}`);
    
    // Tratar erro específico de email já existente
    if (createError.code === 'email_exists' || createError.message.includes('already been registered')) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `Email address "${email}" is already registered` 
      }), { status: 409 }); // 409 Conflict para recurso já existente
    }
    
    // Se o Supabase Auth rejeitar o email como inválido, retornar erro específico
    if (createError.message.includes('invalid') || createError.message.includes('Invalid')) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `Email address "${email}" is invalid` 
      }), { status: 400 });
    }
    
    return new Response(JSON.stringify({ ok: false, error: createError.message }), { status: 400 });
  }
  
  console.log(`✅ [EDGE_FUNCTION] Usuário criado no Supabase Auth com sucesso: ${email}`);

  const newUserId = createData.user?.id;
  if (!newUserId) {
    return new Response(JSON.stringify({ ok: false, error: "User created but ID missing" }), { status: 500 });
  }

  // Upsert into profiles
  const payload: Record<string, unknown> = {
    id: newUserId,
    email,
  };
  if (full_name) payload.full_name = full_name;
  if (role && ["admin", "triage", "service", "panel"].includes(role)) payload.role = role;

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (upsertError) {
    // Return ok with warning to indicate profile needs manual update
    return new Response(JSON.stringify({ ok: true, userId: newUserId, warning: upsertError.message }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  return new Response(JSON.stringify({ ok: true, userId: newUserId }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

Deno.serve(handler);