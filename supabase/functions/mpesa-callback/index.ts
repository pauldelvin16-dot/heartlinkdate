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
    const status = String(cb.ResultCode) === "0" ? "paid" : "failed";
    const sb = admin();
    const { data: payment } = await sb.from("mpesa_payments").update({
      status,
      result_code: String(cb.ResultCode ?? ""),
      result_desc: cb.ResultDesc || null,
      raw_response: body,
    }).eq("checkout_request_id", checkout).select("*").maybeSingle();
    if (payment && status === "paid") {
      await sb.from("premium_subscriptions").insert({ user_id: payment.user_id, plan: "premium", status: "active", notes: `M-Pesa payment ${payment.id}` });
    }
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: (e as Error).message }), { headers: { ...cors, "content-type": "application/json" } });
  }
});
