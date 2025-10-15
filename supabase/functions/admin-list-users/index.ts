import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("email", { ascending: true });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ ok: true, profiles: data ?? [] }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

Deno.serve(handler);