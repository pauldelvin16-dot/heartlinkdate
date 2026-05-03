import { admin, cors, sha256 } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 8) throw new Error("Invalid input");
    const sb = admin();
    const token_hash = await sha256(token);
    const { data: row } = await sb.from("password_reset_tokens").select("*").eq("token_hash", token_hash).maybeSingle();
    if (!row) throw new Error("Invalid or expired link");
    if (row.used_at) throw new Error("Link already used");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Link expired");

    // @ts-ignore admin
    const { error } = await sb.auth.admin.updateUserById(row.user_id, { password });
    if (error) throw error;
    await sb.from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
