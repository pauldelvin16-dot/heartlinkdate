// Keepalive: pinged on a schedule (pg_cron → pg_net) so the project
// database always sees regular activity and never looks idle.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await sb.from("site_settings").select("id").limit(1);
    return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
