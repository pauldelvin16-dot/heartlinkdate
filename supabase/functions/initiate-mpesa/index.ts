import { cors } from "../_shared/mailer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
function authed(req: Request) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
}
function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && /^[17]/.test(digits)) return `254${digits}`;
  throw new Error("Use a valid Safaricom number, e.g. 07XXXXXXXX or 2547XXXXXXXX");
}
function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
async function token(base: string, key: string, secret: string) {
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${text}`);
  return JSON.parse(text).access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = await authed(req).auth.getUser();
    const user = auth.data.user;
    if (!user) throw new Error("Sign in required");
    const { phone } = await req.json().catch(() => ({}));
    const sb = admin();
    const [{ data: settings }, { data: profile }] = await Promise.all([
      sb.from("mpesa_settings").select("*").eq("id", 1).maybeSingle(),
      sb.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    ]);
    if (!settings?.is_active) throw new Error("M-Pesa is not enabled by the admin yet");
    if (!settings.consumer_key || !settings.consumer_secret || !settings.pass_key || !settings.shortcode) throw new Error("M-Pesa admin settings are incomplete");
    const mpesaPhone = normalizePhone(phone || profile?.phone || "");
    const amount = Number(settings.amount || 1);
    const base = settings.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    const ts = timestamp();
    const password = btoa(`${settings.shortcode}${settings.pass_key}${ts}`);
    const accessToken = await token(base, settings.consumer_key, settings.consumer_secret);
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;
    const payload = {
      BusinessShortCode: settings.shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: mpesaPhone,
      PartyB: settings.shortcode,
      PhoneNumber: mpesaPhone,
      CallBackURL: callbackUrl,
      AccountReference: settings.account_reference || "Premium",
      TransactionDesc: settings.description || "Premium unlock",
    };
    const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.json().catch(async () => ({ raw: await res.text() }));
    if (!res.ok || raw.ResponseCode !== "0") throw new Error(raw.errorMessage || raw.ResponseDescription || raw.raw || "M-Pesa STK Push failed");
    const { data: payment, error } = await sb.from("mpesa_payments").insert({
      user_id: user.id,
      phone: mpesaPhone,
      amount,
      status: "processing",
      checkout_request_id: raw.CheckoutRequestID,
      merchant_request_id: raw.MerchantRequestID,
      raw_response: raw,
    }).select("*").single();
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, payment }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
