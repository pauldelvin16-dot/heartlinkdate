import { admin, cors, sha256 } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email, code } = await req.json();
    if (!email || !code) throw new Error("email and code required");
    const sb = admin();
    const code_hash = await sha256(String(code));
    const { data: row } = await sb.from("otp_codes")
      .select("*").eq("email", email).eq("code_hash", code_hash)
      .is("used_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!row) throw new Error("Invalid code");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Code expired");
    await sb.from("otp_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
