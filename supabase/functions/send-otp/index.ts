import { admin, cors, sendMail, sha256, originFromReq } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email, purpose } = await req.json();
    if (!email) throw new Error("email required");
    const normalizedEmail = String(email).trim().toLowerCase();
    const sb = admin();
    // Do not create accounts from OTP login. Only existing users can request login codes.
    // @ts-ignore admin api
    const { data: list } = await sb.auth.admin.listUsers();
    const user = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
    if (!user && (purpose || "login") === "login") {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await sb.from("otp_codes").insert({ email: normalizedEmail, code_hash, purpose: purpose || "login", expires_at });
    await sendMail({
      to: normalizedEmail,
      templateKey: purpose === "2fa" ? "two_factor" : "otp_login",
      vars: { code, name: user?.user_metadata?.display_name || normalizedEmail.split("@")[0], site_url: originFromReq(req) },
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
