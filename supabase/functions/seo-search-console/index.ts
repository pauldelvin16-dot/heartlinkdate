import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function coversTarget(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return target.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const connKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    if (!lovableKey || !connKey) {
      return json({ connected: false, detail: "No Google Search Console account is connected yet." });
    }
    const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey };

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "report";

    const { data: settings } = await supabase
      .from("site_settings")
      .select("gsc_property_url")
      .eq("id", 1)
      .maybeSingle();
    const targetUrl = body.site_url || settings?.gsc_property_url;
    if (!targetUrl) return json({ connected: true, detail: "Save your property URL first." });

    const sitesRes = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
    if (!sitesRes.ok) {
      const text = await sitesRes.text();
      console.error(`gateway /sites failed [${sitesRes.status}]: ${text}`);
      return json({ connected: true, error: "Could not list properties", status: sitesRes.status, details: text }, sitesRes.status);
    }
    const { siteEntry = [] } = await sitesRes.json();
    const target = new URL(targetUrl);
    const matches = siteEntry.filter(
      (e: any) => e.permissionLevel !== "siteUnverifiedUser" && coversTarget(e.siteUrl, target),
    );
    if (matches.length === 0) {
      return json({ connected: true, detail: "No verified Search Console property covers this site yet." });
    }
    if (matches.length > 1 && !body.selected_site_url) {
      return json({ connected: true, selection_required: true, candidates: matches.map((m: any) => m.siteUrl) });
    }
    const siteUrl = body.selected_site_url
      ? matches.find((m: any) => m.siteUrl === body.selected_site_url)?.siteUrl
      : matches[0].siteUrl;
    if (!siteUrl) return json({ connected: true, detail: "The selected property is not verified for this site." });

    if (action === "submit_sitemap") {
      const sitemapUrl = body.sitemap_url || `${String(siteUrl).replace(/\/+$/, "")}/sitemap.xml`;
      const res = await fetch(
        `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
        { method: "PUT", headers },
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`sitemap submit failed [${res.status}]: ${text}`);
        return json({ connected: true, error: "Sitemap submission failed", status: res.status, details: text }, res.status);
      }
      await supabase
        .from("site_settings")
        .update({ sitemap_last_submitted_at: new Date().toISOString() })
        .eq("id", 1);
      return json({ connected: true, submitted: true, siteUrl, sitemapUrl });
    }

    const days = Number(body.days ?? 28);
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const range = { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };

    async function query(dimensions: string[]) {
      const res = await fetch(
        `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ ...range, dimensions, rowLimit: dimensions.length ? 25 : 1 }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`searchAnalytics ${dimensions.join(",")} failed [${res.status}]: ${text}`);
        throw new Error(`[${res.status}]: ${text}`);
      }
      const data = await res.json();
      return data.rows ?? [];
    }

    const [totals, queries, pages, countries, devices] = await Promise.all([
      query([]),
      query(["query"]),
      query(["page"]),
      query(["country"]),
      query(["device"]),
    ]);

    if (action === "import_keywords" && queries.length) {
      const rows = queries.map((r: any) => ({
        keyword: r.keys[0],
        source: "search_console",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
        last_synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("seo_keywords").upsert(rows, { onConflict: "keyword" });
      if (error) console.error("keyword import failed:", error.message);
      return json({ connected: true, imported: error ? 0 : rows.length, siteUrl, error: error?.message });
    }

    return json({
      connected: true,
      siteUrl,
      range,
      totals: totals[0] ?? null,
      queries,
      pages,
      countries,
      devices,
      refreshedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("seo-search-console failed:", e);
    return json({ error: String(e) }, 500);
  }
});
