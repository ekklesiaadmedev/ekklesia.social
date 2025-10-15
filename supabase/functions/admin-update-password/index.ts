import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  userId: string;
  password: string;
};

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

  const { userId, password } = body || {} as Body;
  if (!userId || !password) {
    return new Response(JSON.stringify({ ok: false, error: "Missing userId or password" }), { status: 400 });
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ ok: false, error: "Password too short" }), { status: 400 });
  }

  const supabase = createClient(url, serviceKey);
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

// Deno.serve is required in recent versions for Edge Functions
Deno.serve(handler);