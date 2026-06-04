import { cors } from "../_shared/mailer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function admin() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    const checkout = cb?.CheckoutRequestID;
    if (!checkout) throw new Error("Missing CheckoutRequestID");
    const sb = admin();
    // Atomic + idempotent: locks row, marks status, grants premium only once.
    await sb.rpc("mpesa_mark_paid_and_grant", {
      _checkout_id: checkout,
      _result_code: String(cb.ResultCode ?? ""),
      _result_desc: cb.ResultDesc || null,
      _raw: body,
    });
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    // Always 200 to Safaricom so they don't retry-storm — we logged what we needed.
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: (e as Error).message }), { headers: { ...cors, "content-type": "application/json" } });
  }
});
