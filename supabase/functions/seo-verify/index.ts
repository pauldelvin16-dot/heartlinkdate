import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("site_settings")
      .select("gsc_property_url, gsc_verification_method, google_site_verification")
      .eq("id", 1)
      .maybeSingle();

    if (!settings) return json({ verified: false, detail: "Site settings are missing." }, 200);

    const property = (settings.gsc_property_url || "").replace(/\/+$/, "");
    const method = settings.gsc_verification_method || "meta";
    const token = (settings.google_site_verification || "").trim();

    if (!property) return json({ verified: false, detail: "Add your property URL first." });
    if (!token) return json({ verified: false, detail: "Add your Google verification token first." });

    let verified = false;
    let detail = "";

    if (method === "meta") {
      const res = await fetch(`${property}/`, { headers: { "User-Agent": "HeartLink-SEO-Verifier" } });
      const html = await res.text();
      const match = html.match(/<meta[^>]+name=["']google-site-verification["'][^>]*>/i);
      const content = match?.[0].match(/content=["']([^"']+)["']/i)?.[1]?.trim();
      verified = !!content && content === token;
      detail = !match
        ? "No google-site-verification meta tag found on the live homepage. Publish the site, then recheck."
        : verified
          ? "Meta tag found on the live homepage and the token matches."
          : `A verification meta tag exists but its token does not match the saved token (live: ${content}).`;
    } else if (method === "file") {
      const fileName = token.endsWith(".html") ? token : `google${token}.html`;
      const res = await fetch(`${property}/${fileName}`);
      const body = res.ok ? await res.text() : "";
      verified = res.ok && body.includes("google-site-verification");
      detail = verified
        ? `Verification file /${fileName} is live.`
        : `Verification file /${fileName} was not reachable (HTTP ${res.status}).`;
    } else if (method === "dns") {
      const host = property.replace(/^https?:\/\//, "").split("/")[0];
      const res = await fetch(`https://dns.google/resolve?name=${host}&type=TXT`);
      const dns = await res.json();
      const records: string[] = (dns.Answer ?? []).map((a: any) => String(a.data).replace(/"/g, ""));
      verified = records.some((r) => r.includes(token));
      detail = verified
        ? "Matching TXT record found in DNS."
        : `No matching TXT record yet. Add: google-site-verification=${token}. Found: ${records.join(" | ") || "none"}`;
    } else {
      detail = `Unsupported verification method: ${method}`;
    }

    await supabase
      .from("site_settings")
      .update({ gsc_verified: verified, gsc_last_checked_at: new Date().toISOString(), gsc_last_check_detail: detail })
      .eq("id", 1);

    return json({ verified, detail, method, property });
  } catch (e) {
    console.error("seo-verify failed:", e);
    return json({ verified: false, detail: `Check failed: ${String(e)}` }, 500);
  }
});
