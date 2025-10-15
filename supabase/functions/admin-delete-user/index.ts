import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  userId: string;
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

  const { userId } = body || ({} as Body);
  if (!userId) {
    return new Response(JSON.stringify({ ok: false, error: "Missing userId" }), { status: 400 });
  }

  const supabase = createClient(url, serviceKey);

  // Delete from Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    return new Response(JSON.stringify({ ok: false, error: authError.message }), { status: 400 });
  }

  // Best-effort delete from profiles (ignore error if row not found)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileError) {
    // Return ok but include a warning message
    return new Response(JSON.stringify({ ok: true, warning: profileError.message }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

Deno.serve(handler);