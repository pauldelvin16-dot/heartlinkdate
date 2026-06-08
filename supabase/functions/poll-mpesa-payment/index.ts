import { cors } from "../_shared/mailer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function admin() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); }
function authed(req: Request) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
}
function timestamp() {
  const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
async function token(base: string, key: string, secret: string) {
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` } });
  const text = await res.text(); if (!res.ok) throw new Error(`M-Pesa auth failed: ${text}`);
  return JSON.parse(text).access_token as string;
}
async function grantForPayment(sb: any, payment: any) {
  if (payment.order_id) await sb.rpc("mark_order_paid_for_payment", { _order_id: payment.order_id, _payment_id: payment.id });
  else await sb.rpc("grant_premium_for_payment", { _user_id: payment.user_id, _payment_id: payment.id });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = await authed(req).auth.getUser();
    const user = auth.data.user;
    if (!user) throw new Error("Sign in required");
    const { payment_id } = await req.json();
    if (!payment_id) throw new Error("payment_id required");
    const sb = admin();
    const { data: payment } = await sb.from("mpesa_payments").select("*").eq("id", payment_id).eq("user_id", user.id).maybeSingle();
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "paid") return new Response(JSON.stringify({ ok: true, payment }), { headers: { ...cors, "content-type": "application/json" } });
    const { data: settings } = await sb.from("mpesa_settings").select("*").eq("id", 1).maybeSingle();
    if (!settings?.is_active) throw new Error("M-Pesa is disabled");
    const base = settings.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    const ts = timestamp();
    const accessToken = await token(base, settings.consumer_key, settings.consumer_secret);
    const res = await fetch(`${base}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: settings.shortcode, Password: btoa(`${settings.shortcode}${settings.pass_key}${ts}`), Timestamp: ts, CheckoutRequestID: payment.checkout_request_id }),
    });
    const raw = await res.json().catch(async () => ({ raw: await res.text() }));
    let status = payment.status;
    if (raw.ResultCode === "0") status = "paid";
    else if (raw.ResultCode != null && !["1032", "1037"].includes(String(raw.ResultCode))) status = "failed";
    const { data: updated } = await sb.from("mpesa_payments").update({ status, result_code: String(raw.ResultCode ?? ""), result_desc: raw.ResultDesc || raw.ResponseDescription, raw_response: raw }).eq("id", payment.id).select("*").single();
    if (status === "paid") await grantForPayment(sb, updated || payment);
    return new Response(JSON.stringify({ ok: true, payment: updated || payment }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
