import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("site_settings")
      .select("gsc_property_url, canonical_url")
      .eq("id", 1)
      .maybeSingle();

    const base = (settings?.gsc_property_url || settings?.canonical_url || "https://heartlinkdate.lovable.app")
      .replace(/\/+$/, "");

    const { data: pages } = await supabase
      .from("seo_pages")
      .select("route, changefreq, priority, updated_at")
      .eq("is_published", true)
      .eq("is_indexable", true)
      .eq("in_sitemap", true)
      .order("priority", { ascending: false });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, updated_at")
      .eq("is_public_profile", true)
      .eq("is_active", true)
      .limit(2000);

    const seen = new Set<string>();
    const entries: string[] = [];

    for (const p of pages ?? []) {
      const path = p.route === "/" ? "/" : String(p.route).replace(/\/+$/, "");
      if (seen.has(path)) continue;
      seen.add(path);
      entries.push(
        `  <url><loc>${base}${path}</loc><lastmod>${String(p.updated_at ?? new Date().toISOString()).slice(0, 10)}</lastmod>` +
          `<changefreq>${p.changefreq ?? "weekly"}</changefreq><priority>${Number(p.priority ?? 0.6).toFixed(1)}</priority></url>`,
      );
    }

    for (const pr of profiles ?? []) {
      const path = `/u/${pr.id}`;
      if (seen.has(path)) continue;
      seen.add(path);
      entries.push(
        `  <url><loc>${base}${path}</loc><lastmod>${String(pr.updated_at ?? new Date().toISOString()).slice(0, 10)}</lastmod>` +
          `<changefreq>weekly</changefreq><priority>0.4</priority></url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    console.error("seo-sitemap failed:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
