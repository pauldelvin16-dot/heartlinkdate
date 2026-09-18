/**
 * Build-time sitemap generator.
 * Reads published, indexable, in-sitemap routes from the SEO content store
 * and writes public/sitemap.xml. URLs only — never keywords.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_URL = process.env.SITE_URL || "https://heartlinkdate.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Row = { route: string; changefreq: string | null; priority: number | null };

const FALLBACK: Row[] = [
  { route: "/", changefreq: "weekly", priority: 1.0 },
  { route: "/auth", changefreq: "monthly", priority: 0.5 },
  { route: "/install", changefreq: "monthly", priority: 0.4 },
  { route: "/shop", changefreq: "weekly", priority: 0.7 },
  { route: "/discover", changefreq: "daily", priority: 0.9 },
];

async function fetchRoutes(): Promise<Row[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return FALLBACK;
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/seo_pages` +
      `?select=route,changefreq,priority&is_published=eq.true&is_indexable=eq.true&in_sitemap=eq.true&order=priority.desc`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return FALLBACK;
    const rows = (await res.json()) as Row[];
    return rows.length ? rows : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function xml(rows: Row[]) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const urls = rows
    .map((r) => (r.route === "/" ? "/" : r.route.replace(/\/+$/, "")))
    .filter((p) => p.startsWith("/") && !seen.has(p) && (seen.add(p), true))
    .map((p, i) => {
      const row = rows[i] ?? {};
      return (
        `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod>` +
        `<changefreq>${(row as Row).changefreq || "weekly"}</changefreq>` +
        `<priority>${((row as Row).priority ?? 0.6).toFixed(1)}</priority></url>`
      );
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

const rows = await fetchRoutes();
writeFileSync(resolve("public/sitemap.xml"), xml(rows), "utf8");
console.log(`sitemap.xml written with ${rows.length} URLs`);
