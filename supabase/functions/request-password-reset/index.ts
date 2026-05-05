import { admin, cors, sendMail, sha256, originFromReq } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email } = await req.json();
    if (!email) throw new Error("email required");
    const normalizedEmail = String(email).trim().toLowerCase();
    const sb = admin();

    // Look up user by email via admin API
    // @ts-ignore admin api
    const { data: list } = await sb.auth.admin.listUsers();
    const user = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);

    // Always return success to avoid email enumeration
    if (!user) return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });

    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const token_hash = await sha256(token);
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sb.from("password_reset_tokens").insert({ user_id: user.id, token_hash, expires_at });

    const origin = originFromReq(req);
    const reset_url = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: normalizedEmail,
      templateKey: "password_reset",
      vars: { name: (user.user_metadata?.display_name as string) || normalizedEmail.split("@")[0], reset_url, site_url: origin },
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
