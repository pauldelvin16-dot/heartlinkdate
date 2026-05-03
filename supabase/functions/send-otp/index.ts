import { admin, cors, sendMail, sha256, originFromReq } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email, purpose } = await req.json();
    if (!email) throw new Error("email required");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const sb = admin();
    await sb.from("otp_codes").insert({ email, code_hash, purpose: purpose || "login", expires_at });
    await sendMail({
      to: email,
      templateKey: purpose === "2fa" ? "two_factor" : "otp_login",
      vars: { code, site_url: originFromReq(req) },
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
