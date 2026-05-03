import { cors, sendMail, originFromReq } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { to, name } = await req.json();
    if (!to) throw new Error("to required");
    const site_url = originFromReq(req);
    await sendMail({
      to,
      templateKey: "signup_welcome",
      vars: { name: name || to.split("@")[0], site_url },
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  }
});
