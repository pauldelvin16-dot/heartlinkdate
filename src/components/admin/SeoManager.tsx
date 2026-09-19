import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Plus, RefreshCw, Trash2, Upload } from "lucide-react";

type Props = { s: any; setS: (v: any) => void; saveSettings: () => any };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function SeoManager({ s, setS, saveSettings }: Props) {
  const [pages, setPages] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [audit, setAudit] = useState<{ level: "error" | "warning"; message: string }[] | null>(null);
  const [gsc, setGsc] = useState<any>(null);

  async function loadAll() {
    const [p, q, k, r] = await Promise.all([
      supabase.from("seo_pages").select("*").order("priority", { ascending: false }),
      supabase.from("seo_questions").select("*").order("route").order("sort_order"),
      supabase.from("seo_keywords").select("*").order("impressions", { ascending: false }).limit(300),
      supabase.from("seo_redirects").select("*").order("from_path"),
    ]);
    setPages(p.data ?? []);
    setQuestions(q.data ?? []);
    setKeywords(k.data ?? []);
    setRedirects(r.data ?? []);
  }

  useEffect(() => { loadAll(); }, []);

  const sitemapUrl = (s?.sitemap_url || `${(s?.gsc_property_url || window.location.origin).replace(/\/+$/, "")}/sitemap.xml`);

  async function savePage(row: any) {
    const { id, created_at, updated_at, ...rest } = row;
    const { error } = await supabase.from("seo_pages").update(rest).eq("id", id);
    error ? toast.error(error.message) : toast.success(`Saved ${row.route}`);
  }

  async function saveQuestion(row: any) {
    const { id, created_at, updated_at, ...rest } = row;
    const { error } = await supabase.from("seo_questions").update(rest).eq("id", id);
    error ? toast.error(error.message) : toast.success("Question saved");
  }

  async function runAudit() {
    setBusy("audit");
    const issues: { level: "error" | "warning"; message: string }[] = [];
    const titles = new Map<string, number>();
    const descs = new Map<string, number>();

    for (const p of pages) {
      if (!p.title) issues.push({ level: "error", message: `${p.route}: missing SEO title` });
      else {
        titles.set(p.title, (titles.get(p.title) ?? 0) + 1);
        if (p.title.length > 62) issues.push({ level: "warning", message: `${p.route}: title is ${p.title.length} characters (aim for under 62)` });
      }
      if (!p.meta_description) issues.push({ level: "error", message: `${p.route}: missing meta description` });
      else {
        descs.set(p.meta_description, (descs.get(p.meta_description) ?? 0) + 1);
        if (p.meta_description.length > 165) issues.push({ level: "warning", message: `${p.route}: meta description is ${p.meta_description.length} characters (aim for under 165)` });
      }
      if (!p.h1) issues.push({ level: "error", message: `${p.route}: missing H1 heading` });
      if (p.canonical && !/^https?:\/\//.test(p.canonical)) issues.push({ level: "error", message: `${p.route}: canonical is not an absolute URL` });
      if (p.is_published && p.in_sitemap && !p.is_indexable) issues.push({ level: "error", message: `${p.route}: in sitemap but marked noindex` });
      if ((p.content ?? "").length < 120 && p.is_indexable) issues.push({ level: "warning", message: `${p.route}: thin content — add more unique copy` });
    }
    titles.forEach((n, t) => { if (n > 1) issues.push({ level: "error", message: `Duplicate title used ${n} times: "${t}"` }); });
    descs.forEach((n, d) => { if (n > 1) issues.push({ level: "error", message: `Duplicate meta description used ${n} times` }); });

    for (const r of redirects) {
      if (r.is_active && r.from_path === r.to_path) issues.push({ level: "error", message: `Redirect loop: ${r.from_path}` });
    }
    if (!questions.some(q => q.is_published)) issues.push({ level: "warning", message: "No published FAQ questions — FAQ rich results need visible questions" });

    try {
      const robots = await fetch("/robots.txt").then(r => r.text());
      if (/Disallow:\s*\/\s*$/m.test(robots)) issues.push({ level: "error", message: "robots.txt blocks the whole site" });
      if (!/Sitemap:/i.test(robots)) issues.push({ level: "warning", message: "robots.txt does not reference a sitemap" });
    } catch { issues.push({ level: "error", message: "robots.txt could not be fetched" }); }

    try {
      const xml = await fetch("/sitemap.xml").then(r => r.text());
      if (!xml.includes("<urlset")) issues.push({ level: "error", message: "sitemap.xml is not a valid urlset" });
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      if (new Set(locs).size !== locs.length) issues.push({ level: "error", message: "sitemap.xml contains duplicate URLs" });
      if (!locs.length) issues.push({ level: "error", message: "sitemap.xml has no URLs" });
    } catch { issues.push({ level: "error", message: "sitemap.xml could not be fetched" }); }

    setAudit(issues);
    setBusy(null);
    toast.success(`Audit complete — ${issues.filter(i => i.level === "error").length} errors, ${issues.filter(i => i.level === "warning").length} warnings`);
  }

  async function verifyNow() {
    setBusy("verify");
    await saveSettings();
    const { data, error } = await supabase.functions.invoke("seo-verify", { body: {} });
    setBusy(null);
    if (error) { toast.error("Verification check failed"); return; }
    setS({ ...s, gsc_verified: data.verified, gsc_last_check_detail: data.detail, gsc_last_checked_at: new Date().toISOString() });
    data.verified ? toast.success("Verified by Google") : toast.error(data.detail ?? "Not verified yet");
  }

  async function callGsc(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    const { data, error } = await supabase.functions.invoke("seo-search-console", { body: { action, ...extra } });
    setBusy(null);
    if (error) { toast.error("Search Console request failed"); return; }
    setGsc(data);
    if (data?.connected === false) toast.error(data.detail ?? "No Google account connected");
    else if (data?.detail) toast.message(data.detail);
    else if (action === "submit_sitemap" && data?.submitted) toast.success("Sitemap submitted to Google");
    else if (action === "import_keywords") { toast.success(`Imported ${data.imported ?? 0} queries`); loadAll(); }
  }

  return (
    <Tabs defaultValue="pages" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        {["pages", "questions", "keywords", "redirects", "sitemap", "google", "audit"].map(t => (
          <TabsTrigger key={t} value={t} className="capitalize">{t === "google" ? "Search Console" : t}</TabsTrigger>
        ))}
      </TabsList>

      {/* PAGES */}
      <TabsContent value="pages" className="mt-4 space-y-3">
        {pages.map((p, i) => (
          <div key={p.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.route}</p>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">Index <Switch checked={p.is_indexable} onCheckedChange={v => setPages(pages.map((x, j) => j === i ? { ...x, is_indexable: v } : x))} /></label>
                <label className="flex items-center gap-1.5">Sitemap <Switch checked={p.in_sitemap} onCheckedChange={v => setPages(pages.map((x, j) => j === i ? { ...x, in_sitemap: v } : x))} /></label>
                <label className="flex items-center gap-1.5">Live <Switch checked={p.is_published} onCheckedChange={v => setPages(pages.map((x, j) => j === i ? { ...x, is_published: v } : x))} /></label>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="SEO title"><Input value={p.title ?? ""} onChange={e => setPages(pages.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} /></Row>
              <Row label="H1 heading"><Input value={p.h1 ?? ""} onChange={e => setPages(pages.map((x, j) => j === i ? { ...x, h1: e.target.value } : x))} /></Row>
              <Row label="Canonical URL"><Input value={p.canonical ?? ""} onChange={e => setPages(pages.map((x, j) => j === i ? { ...x, canonical: e.target.value } : x))} /></Row>
              <Row label="Schema type">
                <Select value={p.schema_type ?? "WebPage"} onValueChange={v => setPages(pages.map((x, j) => j === i ? { ...x, schema_type: v } : x))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["WebPage", "CollectionPage", "FAQPage", "AboutPage", "ProfilePage", "ItemPage"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Row>
            </div>
            <Row label="Meta description"><Textarea rows={2} value={p.meta_description ?? ""} onChange={e => setPages(pages.map((x, j) => j === i ? { ...x, meta_description: e.target.value } : x))} /></Row>
            <Row label="Keywords (comma separated)">
              <Input value={(p.keywords ?? []).join(", ")} onChange={e => setPages(pages.map((x, j) => j === i ? { ...x, keywords: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean) } : x))} />
            </Row>
            <Row label="Page copy / intro"><Textarea rows={3} value={p.content ?? ""} onChange={e => setPages(pages.map((x, j) => j === i ? { ...x, content: e.target.value } : x))} /></Row>
            <Button size="sm" onClick={() => savePage(p)} className="gradient-primary text-primary-foreground">Save {p.route}</Button>
          </div>
        ))}
        {pages.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No SEO pages yet.</p>}
      </TabsContent>

      {/* QUESTIONS */}
      <TabsContent value="questions" className="mt-4 space-y-3">
        <Button size="sm" variant="outline" onClick={async () => {
          const { error } = await supabase.from("seo_questions").insert({ question: "New question", answer: "", route: "/", sort_order: questions.length + 1, is_published: false });
          error ? toast.error(error.message) : loadAll();
        }}><Plus className="mr-1 h-4 w-4" /> Add question</Button>
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{q.route}</Badge>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5">Published <Switch checked={q.is_published} onCheckedChange={v => setQuestions(questions.map((x, j) => j === i ? { ...x, is_published: v } : x))} /></label>
                <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("seo_questions").delete().eq("id", q.id); loadAll(); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <Row label="Question"><Input value={q.question ?? ""} onChange={e => setQuestions(questions.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} /></Row>
            <Row label="Answer"><Textarea rows={3} value={q.answer ?? ""} onChange={e => setQuestions(questions.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} /></Row>
            <div className="grid gap-2 sm:grid-cols-3">
              <Row label="Shown on route"><Input value={q.route ?? ""} onChange={e => setQuestions(questions.map((x, j) => j === i ? { ...x, route: e.target.value } : x))} /></Row>
              <Row label="Topic"><Input value={q.topic ?? ""} onChange={e => setQuestions(questions.map((x, j) => j === i ? { ...x, topic: e.target.value } : x))} /></Row>
              <Row label="Order"><Input type="number" value={q.sort_order ?? 0} onChange={e => setQuestions(questions.map((x, j) => j === i ? { ...x, sort_order: Number(e.target.value) } : x))} /></Row>
            </div>
            <Button size="sm" onClick={() => saveQuestion(q)} className="gradient-primary text-primary-foreground">Save</Button>
          </div>
        ))}
      </TabsContent>

      {/* KEYWORDS */}
      <TabsContent value="keywords" className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => callGsc("import_keywords")} disabled={busy === "import_keywords"}>
            <Upload className="mr-1 h-4 w-4" /> Import real Search Console queries
          </Button>
          <Button size="sm" variant="ghost" onClick={loadAll}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="p-2 text-left">Keyword</th><th className="p-2">Clicks</th><th className="p-2">Impr.</th><th className="p-2">CTR</th><th className="p-2">Pos.</th><th className="p-2">Source</th></tr>
            </thead>
            <tbody>
              {keywords.map(k => (
                <tr key={k.id} className="border-t border-border">
                  <td className="p-2">{k.keyword}</td>
                  <td className="p-2 text-center">{k.clicks ?? 0}</td>
                  <td className="p-2 text-center">{k.impressions ?? 0}</td>
                  <td className="p-2 text-center">{k.ctr ? `${(k.ctr * 100).toFixed(1)}%` : "—"}</td>
                  <td className="p-2 text-center">{k.position ? Number(k.position).toFixed(1) : "—"}</td>
                  <td className="p-2 text-center text-xs text-muted-foreground">{k.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* REDIRECTS */}
      <TabsContent value="redirects" className="mt-4 space-y-3">
        <Button size="sm" variant="outline" onClick={async () => {
          const { error } = await supabase.from("seo_redirects").insert({ from_path: `/old-${Date.now()}`, to_path: "/", code: 301, is_active: false });
          error ? toast.error(error.message) : loadAll();
        }}><Plus className="mr-1 h-4 w-4" /> Add redirect</Button>
        {redirects.map((r, i) => (
          <div key={r.id} className="grid items-end gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_90px_auto_auto]">
            <Row label="From"><Input value={r.from_path} onChange={e => setRedirects(redirects.map((x, j) => j === i ? { ...x, from_path: e.target.value } : x))} /></Row>
            <Row label="To"><Input value={r.to_path} onChange={e => setRedirects(redirects.map((x, j) => j === i ? { ...x, to_path: e.target.value } : x))} /></Row>
            <Row label="Code"><Input type="number" value={r.code} onChange={e => setRedirects(redirects.map((x, j) => j === i ? { ...x, code: Number(e.target.value) } : x))} /></Row>
            <label className="flex items-center gap-1.5 pb-2 text-xs">Active <Switch checked={r.is_active} onCheckedChange={v => setRedirects(redirects.map((x, j) => j === i ? { ...x, is_active: v } : x))} /></label>
            <div className="flex gap-1 pb-1">
              <Button size="sm" onClick={async () => {
                const { id, created_at, updated_at, ...rest } = r;
                const { error } = await supabase.from("seo_redirects").update(rest).eq("id", id);
                error ? toast.error(error.message) : toast.success("Redirect saved");
              }}>Save</Button>
              <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("seo_redirects").delete().eq("id", r.id); loadAll(); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </TabsContent>

      {/* SITEMAP */}
      <TabsContent value="sitemap" className="mt-4 space-y-3">
        <Row label="Sitemap URL"><Input value={s.sitemap_url ?? ""} onChange={e => setS({ ...s, sitemap_url: e.target.value })} placeholder={sitemapUrl} /></Row>
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p>Static file: <a className="text-primary hover:underline" href="/sitemap.xml" target="_blank" rel="noreferrer">/sitemap.xml</a> — rebuilt from your SEO pages on every deploy.</p>
          <p>Always-current feed: the <code>seo-sitemap</code> backend function serves live XML the moment you publish changes.</p>
          <p>Robots: <a className="text-primary hover:underline" href="/robots.txt" target="_blank" rel="noreferrer">/robots.txt</a> references the sitemap and allows Googlebot.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save</Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(s.sitemap_url || sitemapUrl); toast.success("Sitemap URL copied"); }}><Copy className="mr-1 h-4 w-4" /> Copy sitemap URL</Button>
          <Button variant="outline" onClick={() => callGsc("submit_sitemap", { sitemap_url: s.sitemap_url || sitemapUrl })} disabled={busy === "submit_sitemap"}>
            <Upload className="mr-1 h-4 w-4" /> Submit sitemap to Google
          </Button>
        </div>
      </TabsContent>

      {/* SEARCH CONSOLE */}
      <TabsContent value="google" className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Property URL"><Input value={s.gsc_property_url ?? ""} onChange={e => setS({ ...s, gsc_property_url: e.target.value })} placeholder="https://heartlinkdate.lovable.app" /></Row>
          <Row label="Verification method">
            <Select value={s.gsc_verification_method ?? "meta"} onValueChange={v => setS({ ...s, gsc_verification_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">HTML meta tag</SelectItem>
                <SelectItem value="file">HTML file</SelectItem>
                <SelectItem value="dns">DNS TXT record</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Verification token"><Input value={s.google_site_verification ?? ""} onChange={e => setS({ ...s, google_site_verification: e.target.value })} placeholder="token only, not the full tag" /></Row>
          <Row label="Meta title (site default)"><Input value={s.meta_title ?? ""} onChange={e => setS({ ...s, meta_title: e.target.value })} /></Row>
          <Row label="Meta description (site default)"><Textarea rows={2} value={s.meta_description ?? ""} onChange={e => setS({ ...s, meta_description: e.target.value })} /></Row>
          <Row label="Favicon URL"><Input value={s.favicon_url ?? ""} onChange={e => setS({ ...s, favicon_url: e.target.value })} /></Row>
          <Row label="Social share image URL"><Input value={s.og_image_url ?? ""} onChange={e => setS({ ...s, og_image_url: e.target.value })} /></Row>
        </div>

        <div className={`rounded-xl border p-3 text-sm ${s.gsc_verified ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
          <p className="flex items-center gap-2 font-semibold">
            {s.gsc_verified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            {s.gsc_verified ? "Verified by Google" : "Not verified yet"}
          </p>
          {s.gsc_last_check_detail && <p className="mt-1 text-xs text-muted-foreground">{s.gsc_last_check_detail}</p>}
          {s.gsc_last_checked_at && <p className="text-[10px] text-muted-foreground">Last checked {new Date(s.gsc_last_checked_at).toLocaleString()}</p>}
          {s.gsc_verification_method === "dns" && s.google_site_verification && (
            <p className="mt-2 rounded-lg bg-background/60 p-2 font-mono text-[11px]">TXT @ → google-site-verification={s.google_site_verification}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save</Button>
          <Button variant="outline" onClick={verifyNow} disabled={busy === "verify"}>{busy === "verify" ? "Checking…" : "Verify now"}</Button>
          <Button variant="outline" onClick={verifyNow} disabled={busy === "verify"}><RefreshCw className="mr-1 h-4 w-4" /> Recheck verification</Button>
          <Button variant="ghost" asChild><a href="https://search.google.com/search-console" target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Open Search Console</a></Button>
          <Button variant="outline" onClick={() => callGsc("report", { days: 28 })} disabled={busy === "report"}>Load performance (28 days)</Button>
        </div>

        {gsc?.connected === false && (
          <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">{gsc.detail} Connect a Google account to see real Search Console data — no numbers are ever estimated.</p>
        )}
        {gsc?.selection_required && (
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="mb-2 font-medium">Several verified properties match. Choose one:</p>
            <div className="flex flex-wrap gap-2">
              {gsc.candidates.map((c: string) => (
                <Button key={c} size="sm" variant="outline" onClick={() => callGsc("report", { days: 28, selected_site_url: c })}>{c}</Button>
              ))}
            </div>
          </div>
        )}
        {gsc?.totals && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Clicks", gsc.totals.clicks ?? 0],
                ["Impressions", gsc.totals.impressions ?? 0],
                ["CTR", `${((gsc.totals.ctr ?? 0) * 100).toFixed(1)}%`],
                ["Avg position", Number(gsc.totals.position ?? 0).toFixed(1)],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
                  <p className="text-lg font-bold">{String(v)}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {[["Top queries", gsc.queries], ["Top pages", gsc.pages], ["Countries", gsc.countries], ["Devices", gsc.devices]].map(([title, rows]: any) => (
                <div key={title} className="rounded-xl border border-border">
                  <p className="border-b border-border p-2 text-xs font-semibold">{title}</p>
                  <div className="max-h-64 overflow-y-auto text-xs">
                    {(rows ?? []).map((r: any, i: number) => (
                      <div key={i} className="flex justify-between gap-2 border-b border-border/50 p-2">
                        <span className="truncate">{r.keys?.[0]}</span>
                        <span className="shrink-0 text-muted-foreground">{r.clicks} clicks · {r.impressions} impr · pos {Number(r.position).toFixed(1)}</span>
                      </div>
                    ))}
                    {!(rows ?? []).length && <p className="p-2 text-muted-foreground">No data for this range.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* AUDIT */}
      <TabsContent value="audit" className="mt-4 space-y-3">
        <Button onClick={runAudit} disabled={busy === "audit"} className="gradient-primary text-primary-foreground">
          {busy === "audit" ? "Running…" : "Run SEO audit"}
        </Button>
        {audit && (
          <div className="space-y-2">
            {audit.length === 0 && <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">No issues found.</p>}
            {(["error", "warning"] as const).map(level => (
              audit.some(i => i.level === level) && (
                <div key={level} className="rounded-xl border border-border">
                  <p className="border-b border-border p-2 text-xs font-semibold capitalize">{level}s ({audit.filter(i => i.level === level).length})</p>
                  <ul className="divide-y divide-border/50 text-sm">
                    {audit.filter(i => i.level === level).map((i, k) => (
                      <li key={k} className="flex items-start gap-2 p-2">
                        {level === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                        <span>{i.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
