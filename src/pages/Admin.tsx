import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, Shield, Crown, Send, Settings, Mail, FileText, Link2, Users, Heart,
  Globe2, MapPin, LogOut, Menu, X, Search, ChevronRight, Home, Smartphone, Package, Inbox, MessageCircle, CheckCircle2,
  Megaphone, Image as ImageIcon, Video, Sparkles, ShoppingBag, Truck,
} from "lucide-react";

type TabKey = "site" | "countries" | "smtp" | "emails" | "contacts" | "users" | "matches" | "locations" | "mpesa" | "packages" | "requests" | "ads" | "leads" | "products" | "orders" | "seo";

const NAV: { key: TabKey; label: string; icon: any }[] = [
  { key: "site", label: "Site", icon: Settings },
  { key: "countries", label: "Countries", icon: Globe2 },
  { key: "smtp", label: "SMTP", icon: Mail },
  { key: "emails", label: "Email templates", icon: FileText },
  { key: "contacts", label: "Connectors", icon: Link2 },
  { key: "users", label: "Users", icon: Users },
  { key: "matches", label: "Matches", icon: Heart },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "mpesa", label: "M-Pesa", icon: Smartphone },
  { key: "packages", label: "Packages", icon: Package },
  { key: "requests", label: "Connection requests", icon: Inbox },
  { key: "ads", label: "Ads", icon: Megaphone },
  { key: "leads", label: "Ad leads", icon: Inbox },
  { key: "products", label: "Products", icon: Package },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "seo", label: "SEO", icon: Sparkles },
];

const Admin = () => {
  const { user, signOut } = useAuth();
  const site = useSiteSettings();
  const [tab, setTab] = useState<TabKey>("site");
  const [open, setOpen] = useState(false); // mobile drawer

  const [s, setS] = useState<any>(null);
  const [smtp, setSmtp] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [mpesa, setMpesa] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [grantDays, setGrantDays] = useState(30);
  const [ads, setAds] = useState<any[]>([]);
  const [adStats, setAdStats] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState<any>({ name: "", description: "", price_kes: 0, image_url: "", category: "", stock: 0, sort_order: 0, is_active: true });
  const [newAd, setNewAd] = useState<any>({ title: "", body: "", cta_text: "", placement: "banner", image_url: "", video_url: "", link_url: "", reward_swipes: 5, weight: 1, is_active: true, is_skippable: true, skip_after_seconds: 5, target_countries: [], campaign_type: "reward", form_fields: "", open_in_new_tab: true, app_store_url: "", play_store_url: "" });

  const [newC, setNewC] = useState({ label: "", whatsapp: "", email: "", phone: "", notes: "" });
  const [newPkg, setNewPkg] = useState({ name: "", description: "", amount: 299, duration_days: 30, features: "", is_popular: false });
  const [testTo, setTestTo] = useState("");
  const [newCountry, setNewCountry] = useState("");

  useEffect(() => { reload(); }, []);

  async function reload() {
    const [s1, smtp1, c1, p1, m1, t1, l1, mp1, pay1, pkg1, req1, ad1, lead1, prod1, ord1] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("smtp_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("premium_contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("email_templates").select("*").order("key"),
      supabase.from("user_locations").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("mpesa_settings").select("*").eq("id", 1).maybeSingle(),
      (supabase as any).from("mpesa_payments").select("*").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("mpesa_packages").select("*").order("sort_order"),
      (supabase as any).from("connection_requests").select("*").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("ads").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("ad_leads").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("products").select("*").order("sort_order"),
      (supabase as any).from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setS(s1.data); setSmtp(smtp1.data); setContacts(c1.data ?? []);
    setProfiles(p1.data ?? []); setMatches(m1.data ?? []); setTemplates(t1.data ?? []);
    setLocations(l1.data ?? []);
    setMpesa(mp1.data); setPayments(pay1.data ?? []);
    setPackages(pkg1.data ?? []); setRequests(req1.data ?? []);
    setAds(ad1.data ?? []);
    setLeads(lead1.data ?? []); setProducts(prod1.data ?? []); setOrders(ord1.data ?? []);
    const { data: stats } = await (supabase as any).rpc("ad_stats");
    setAdStats(stats ?? []);
  }

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p =>
      [p.display_name, p.email, p.phone, p.country, p.city, p.gender, p.orientation, p.religion, p.id]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [search, profiles]);

  const stats = useMemo(() => ({
    users: profiles.filter(p => !p.is_simulated).length,
    premium: profiles.filter(p => p.is_premium).length,
    matches: matches.length,
    countries: new Set(profiles.map(p => p.country).filter(Boolean)).size,
  }), [profiles, matches]);

  async function saveSettings() {
    const { error } = await supabase.from("site_settings").update({
      site_name: s.site_name, tagline: s.tagline, logo_url: s.logo_url,
      contact_email: s.contact_email, contact_whatsapp: s.contact_whatsapp,
      premium_message: s.premium_message,
      enable_otp_login: !!s.enable_otp_login, enable_2fa_email: !!s.enable_2fa_email,
      allowed_country_codes: s.allowed_country_codes ?? [],
      meta_title: s.meta_title ?? null, meta_description: s.meta_description ?? null,
      meta_keywords: s.meta_keywords ?? null, og_image_url: s.og_image_url ?? null,
      favicon_url: s.favicon_url ?? null, canonical_url: s.canonical_url ?? null,
      google_site_verification: s.google_site_verification ?? null,
      ads_enabled: s.ads_enabled !== false,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }
  async function saveAd(a: any) {
    const tc = Array.isArray(a.target_countries)
      ? a.target_countries
      : typeof a.target_countries === "string"
        ? a.target_countries.split(",").map((x: string) => x.trim()).filter(Boolean)
        : [];
    let form_fields: any = a.form_fields;
    if (typeof form_fields === "string") {
      try { form_fields = form_fields.trim() ? JSON.parse(form_fields) : []; }
      catch { return toast.error("Form fields must be valid JSON array"); }
    }
    if (!Array.isArray(form_fields)) form_fields = [];
    const payload = {
      title: a.title, body: a.body || null, cta_text: a.cta_text || null,
      placement: a.placement || "banner", image_url: a.image_url || null,
      video_url: a.video_url || null, link_url: a.link_url || null,
      reward_swipes: Number(a.reward_swipes) || 5, weight: Number(a.weight) || 1,
      is_active: a.is_active !== false,
      is_skippable: a.is_skippable !== false,
      skip_after_seconds: Number(a.skip_after_seconds) || 5,
      target_countries: tc,
      campaign_type: a.campaign_type || "reward",
      form_fields,
      open_in_new_tab: a.open_in_new_tab !== false,
      app_store_url: a.app_store_url || null,
      play_store_url: a.play_store_url || null,
    };
    if (a.id) {
      const { error } = await (supabase as any).from("ads").update(payload).eq("id", a.id);
      if (error) return toast.error(error.message);
    } else {
      if (!payload.title) return toast.error("Title required");
      const { error } = await (supabase as any).from("ads").insert(payload);
      if (error) return toast.error(error.message);
      setNewAd({ title: "", body: "", cta_text: "", placement: "banner", image_url: "", video_url: "", link_url: "", reward_swipes: 5, weight: 1, is_active: true, is_skippable: true, skip_after_seconds: 5, target_countries: [], campaign_type: "reward", form_fields: "", open_in_new_tab: true, app_store_url: "", play_store_url: "" });
    }
    toast.success("Ad saved"); reload();
  }
  async function delAd(id: string) { await (supabase as any).from("ads").delete().eq("id", id); reload(); }
  async function saveProduct(p: any) {
    const payload = {
      name: p.name, description: p.description || null,
      price_kes: Number(p.price_kes) || 0, image_url: p.image_url || null,
      category: p.category || null, stock: Number(p.stock) || 0,
      sort_order: Number(p.sort_order) || 0, is_active: p.is_active !== false,
    };
    if (!payload.name) return toast.error("Name required");
    if (p.id) {
      const { error } = await (supabase as any).from("products").update(payload).eq("id", p.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from("products").insert(payload);
      if (error) return toast.error(error.message);
      setNewProduct({ name: "", description: "", price_kes: 0, image_url: "", category: "", stock: 0, sort_order: 0, is_active: true });
    }
    toast.success("Product saved"); reload();
  }
  async function delProduct(id: string) { await (supabase as any).from("products").delete().eq("id", id); reload(); }
  async function updateOrderStatus(o: any, status: string) {
    const updates: any = { status };
    if (status === "paid" && !o.paid_at) updates.paid_at = new Date().toISOString();
    if (status === "shipped" && !o.shipped_at) updates.shipped_at = new Date().toISOString();
    if (status === "delivered" && !o.delivered_at) updates.delivered_at = new Date().toISOString();
    const { error } = await (supabase as any).from("orders").update(updates).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(`Order ${status}`); reload();
  }
  async function saveSmtp() {
    const port = Number(smtp.port) || 587;
    const { error } = await supabase.from("smtp_settings").update({
      host: smtp.host, port, secure: port === 465,
      username: smtp.username, password: smtp.password,
      from_email: smtp.from_email, from_name: smtp.from_name, reply_to: smtp.reply_to,
      is_active: !!smtp.is_active, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("SMTP saved");
  }
  async function saveMpesa() {
    const { error } = await (supabase as any).from("mpesa_settings").update({
      is_active: !!mpesa.is_active, environment: mpesa.environment || "sandbox",
      consumer_key: mpesa.consumer_key, consumer_secret: mpesa.consumer_secret,
      pass_key: mpesa.pass_key, shortcode: mpesa.shortcode,
      account_reference: mpesa.account_reference || "Premium",
      description: mpesa.description || "Premium unlock",
      amount: Number(mpesa.amount) || 1, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("M-Pesa settings saved");
  }
  async function sendTest() {
    if (!testTo) return toast.error("Enter a test recipient");
    const { error, data } = await supabase.functions.invoke("welcome-email", { body: { to: testTo, name: "Test" } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success("Test email sent");
  }
  async function addContact() {
    if (!newC.label) return toast.error("Label required");
    const { error } = await supabase.from("premium_contacts").insert(newC);
    if (error) return toast.error(error.message);
    setNewC({ label: "", whatsapp: "", email: "", phone: "", notes: "" });
    reload();
  }
  async function delContact(id: string) { await supabase.from("premium_contacts").delete().eq("id", id); reload(); }
  async function makeMeAdmin() {
    if (!user) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("You're now admin"); setTimeout(() => location.reload(), 600);
  }
  async function togglePremium(id: string, makePremium: boolean, days = 30) {
    if (makePremium) {
      const { error } = await (supabase as any).rpc("grant_premium_manual", { _user_id: id, _days: days, _note: "admin grant" });
      if (error) return toast.error(error.message);
    } else {
      await supabase.from("premium_subscriptions").update({ status: "cancelled", expires_at: new Date().toISOString() }).eq("user_id", id).eq("status", "active");
      await supabase.from("profiles").update({ is_premium: false }).eq("id", id);
    }
    toast.success("Updated"); reload();
  }
  async function savePackage(p: any) {
    const features = typeof p.features === "string" ? p.features.split(",").map((x: string) => x.trim()).filter(Boolean) : (p.features ?? []);
    const payload = { name: p.name, description: p.description, amount: Number(p.amount), duration_days: Number(p.duration_days), features, is_popular: !!p.is_popular, is_active: p.is_active ?? true, sort_order: Number(p.sort_order ?? 0) };
    if (p.id) {
      const { error } = await (supabase as any).from("mpesa_packages").update(payload).eq("id", p.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from("mpesa_packages").insert(payload);
      if (error) return toast.error(error.message);
      setNewPkg({ name: "", description: "", amount: 299, duration_days: 30, features: "", is_popular: false });
    }
    toast.success("Package saved"); reload();
  }
  async function delPackage(id: string) { await (supabase as any).from("mpesa_packages").delete().eq("id", id); reload(); }
  async function resolveRequest(r: any, status: "approved" | "declined") {
    if (status === "approved") {
      const { data: m } = await supabase.from("matches").select("*").eq("id", r.match_id).maybeSingle();
      if (m) {
        const a = [m.user_a, m.user_b].sort()[0];
        const b = [m.user_a, m.user_b].sort()[1];
        await (supabase as any).from("admin_connections").upsert({ user_a: a, user_b: b, granted_by: user?.id }, { onConflict: "user_a,user_b" });
      }
    }
    await (supabase as any).from("connection_requests").update({ status, resolved_at: new Date().toISOString() }).eq("id", r.id);
    toast.success(`Request ${status}`); reload();
  }
  async function toggleActive(id: string, active: boolean) {
    await supabase.from("profiles").update({ is_active: active }).eq("id", id);
    reload();
  }
  async function saveTemplate(t: any) {
    const { error } = await supabase.from("email_templates").update({ subject: t.subject, html: t.html, is_active: t.is_active, updated_at: new Date().toISOString() }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
  }
  function addCountryCode() {
    let c = newCountry.trim();
    if (!c) return;
    if (!c.startsWith("+")) c = "+" + c;
    if (!/^\+\d{1,4}$/.test(c)) return toast.error("Use format like +44");
    const next = Array.from(new Set([...(s.allowed_country_codes ?? []), c]));
    setS({ ...s, allowed_country_codes: next });
    setNewCountry("");
  }
  function removeCountryCode(c: string) {
    setS({ ...s, allowed_country_codes: (s.allowed_country_codes ?? []).filter((x: string) => x !== c) });
  }

  if (!s) return (
    <div className="container py-10">
      <p className="text-muted-foreground">Loading admin… If you're the first user, claim admin access:</p>
      <Button onClick={makeMeAdmin} className="mt-3 gradient-primary text-primary-foreground"><Crown className="mr-2 h-4 w-4" /> Claim admin</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur md:hidden">
        <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-border"><Menu className="h-4 w-4" /></button>
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg gradient-primary text-primary-foreground"><Shield className="h-3.5 w-3.5" /></div>
          <span className="font-display font-bold">{site?.site_name ?? "Admin"}</span>
        </div>
        <Link to="/discover" className="text-xs text-muted-foreground">Exit</Link>
      </header>

      <div className="flex">
        {/* Sidebar (desktop fixed, mobile drawer) */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary text-primary-foreground"><Shield className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-bold leading-tight">{site?.site_name ?? "HeartLink"}</p>
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Admin console</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="md:hidden"><X className="h-4 w-4" /></button>
          </div>
          <nav className="p-2">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setTab(key); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {label}
                {tab === key && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </button>
            ))}
          </nav>
          <div className="absolute inset-x-2 bottom-2 space-y-1">
            <NavLink to="/discover" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Home className="h-4 w-4" /> Back to app</NavLink>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </aside>
        {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />}

        {/* Main */}
        <main className="min-h-screen flex-1 px-4 py-6 md:px-8">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Users} label="Users" value={stats.users} />
            <Stat icon={Crown} label="Premium" value={stats.premium} accent />
            <Stat icon={Heart} label="Matches" value={stats.matches} />
            <Stat icon={Globe2} label="Countries" value={stats.countries} />
          </div>

          {tab === "site" && (
            <Section title="Site settings" subtitle="Configure your brand and contact channels">
              <Field label="Site name"><Input value={s.site_name ?? ""} onChange={e => setS({ ...s, site_name: e.target.value })} /></Field>
              <Field label="Tagline"><Input value={s.tagline ?? ""} onChange={e => setS({ ...s, tagline: e.target.value })} /></Field>
              <Field label="Logo URL"><Input value={s.logo_url ?? ""} onChange={e => setS({ ...s, logo_url: e.target.value })} placeholder="https://…" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Contact email"><Input value={s.contact_email ?? ""} onChange={e => setS({ ...s, contact_email: e.target.value })} /></Field>
                <Field label="Contact WhatsApp"><Input value={s.contact_whatsapp ?? ""} onChange={e => setS({ ...s, contact_whatsapp: e.target.value })} placeholder="+44…" /></Field>
              </div>
              <Field label="Premium connect message"><Textarea value={s.premium_message ?? ""} onChange={e => setS({ ...s, premium_message: e.target.value })} /></Field>
              <Toggle label="Allow OTP email login" hint="Users can sign in with a one-time code." checked={!!s.enable_otp_login} onChange={v => setS({ ...s, enable_otp_login: v })} />
              <Toggle label="Optional 2FA via email" hint="Users can opt in to email 2FA." checked={!!s.enable_2fa_email} onChange={v => setS({ ...s, enable_2fa_email: v })} />
              <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save changes</Button>
            </Section>
          )}

          {tab === "countries" && (
            <Section title="Allowed countries" subtitle="Phone dial codes accepted at signup. Add or remove freely.">
              <div className="flex gap-2">
                <Input placeholder="+44" value={newCountry} onChange={e => setNewCountry(e.target.value)} className="max-w-[140px]" />
                <Button onClick={addCountryCode}><Plus className="mr-1 h-4 w-4" /> Add code</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(s.allowed_country_codes ?? []).map((c: string) => (
                  <Badge key={c} variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                    {c}
                    <button onClick={() => removeCountryCode(c)} className="opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
                {(s.allowed_country_codes ?? []).length === 0 && <p className="text-sm text-muted-foreground">No codes — signup will reject all phones.</p>}
              </div>
              <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save countries</Button>
            </Section>
          )}

          {tab === "smtp" && smtp && (
            <Section title="SMTP server" subtitle="Nodemailer with TLS 1.2+ verified handshake. STARTTLS on 587, SSL on 465.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Host"><Input value={smtp.host ?? ""} onChange={e => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" /></Field>
                <Field label="Port"><Input type="number" value={smtp.port ?? 587} onChange={e => setSmtp({ ...smtp, port: e.target.value })} /></Field>
                <Field label="Username"><Input value={smtp.username ?? ""} onChange={e => setSmtp({ ...smtp, username: e.target.value })} /></Field>
                <Field label="Password"><Input type="password" value={smtp.password ?? ""} onChange={e => setSmtp({ ...smtp, password: e.target.value })} /></Field>
                <Field label="From name"><Input value={smtp.from_name ?? ""} onChange={e => setSmtp({ ...smtp, from_name: e.target.value })} /></Field>
                <Field label="From email"><Input type="email" value={smtp.from_email ?? ""} onChange={e => setSmtp({ ...smtp, from_email: e.target.value })} /></Field>
                <Field label="Reply-to (optional)"><Input value={smtp.reply_to ?? ""} onChange={e => setSmtp({ ...smtp, reply_to: e.target.value })} /></Field>
              </div>
              <Toggle label="Use SSL (port 465)" hint="Off = STARTTLS on 587. Saving also auto-corrects this from the port." checked={Number(smtp.port) === 465} onChange={v => setSmtp({ ...smtp, secure: v, port: v ? 465 : 587 })} />
              <Toggle label="Enable email sending" checked={!!smtp.is_active} onChange={v => setSmtp({ ...smtp, is_active: v })} />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={saveSmtp} className="gradient-primary text-primary-foreground">Save SMTP</Button>
                <Input className="max-w-xs" placeholder="test@you.com" value={testTo} onChange={e => setTestTo(e.target.value)} />
                <Button variant="outline" onClick={sendTest}><Send className="mr-1.5 h-4 w-4" /> Send test welcome</Button>
              </div>
            </Section>
          )}

          {tab === "emails" && (
            <Section title="Email templates" subtitle={"Variables: {{site_name}} {{name}} {{site_url}} {{reset_url}} {{code}}"}>
              {templates.map((t, i) => (
                <div key={t.id} className="space-y-2 rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold capitalize">{t.key.replace(/_/g, " ")}</p>
                    <Switch checked={!!t.is_active} onCheckedChange={v => { const n = [...templates]; n[i] = { ...t, is_active: v }; setTemplates(n); }} />
                  </div>
                  <Input value={t.subject} onChange={e => { const n = [...templates]; n[i] = { ...t, subject: e.target.value }; setTemplates(n); }} />
                  <Textarea rows={6} className="font-mono text-xs" value={t.html} onChange={e => { const n = [...templates]; n[i] = { ...t, html: e.target.value }; setTemplates(n); }} />
                  <Button size="sm" onClick={() => saveTemplate(templates[i])}>Save template</Button>
                </div>
              ))}
            </Section>
          )}

          {tab === "contacts" && (
            <Section title="Premium connectors" subtitle="Admin or moderator contacts for matched users.">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Label" value={newC.label} onChange={e => setNewC({ ...newC, label: e.target.value })} />
                <Input placeholder="WhatsApp +44…" value={newC.whatsapp} onChange={e => setNewC({ ...newC, whatsapp: e.target.value })} />
                <Input placeholder="Email" value={newC.email} onChange={e => setNewC({ ...newC, email: e.target.value })} />
                <Input placeholder="Phone" value={newC.phone} onChange={e => setNewC({ ...newC, phone: e.target.value })} />
              </div>
              <Textarea placeholder="Notes shown to user" value={newC.notes} onChange={e => setNewC({ ...newC, notes: e.target.value })} />
              <Button onClick={addContact}><Plus className="mr-1 h-4 w-4" /> Add connector</Button>
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                    <div className="text-sm"><strong>{c.label}</strong> · {c.whatsapp ?? c.email ?? c.phone}</div>
                    <Button size="icon" variant="ghost" onClick={() => delContact(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {tab === "users" && (
            <Section title="All users" subtitle={`${profiles.length} profiles. Click any user to view full info.`}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name, country, gender…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground lg:grid-cols-[2fr_1.4fr_1fr_1fr_auto_auto]">
                  <div>Name</div><div className="hidden lg:block">Email / phone</div><div className="hidden lg:block">Location</div><div className="hidden lg:block">Gender</div><div>Status</div><div></div>
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  {filteredProfiles.map(p => (
                    <div key={p.id} onClick={() => setActiveProfile(p)}
                      className="grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-sm transition hover:bg-muted/40 lg:grid-cols-[2fr_1.4fr_1fr_1fr_auto_auto]">
                      <div className="flex items-center gap-2 truncate">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-bold">{p.display_name?.[0]?.toUpperCase() ?? "?"}</div>
                        <span className="truncate font-medium">{p.display_name}</span>
                        {p.is_premium && <Crown className="h-3.5 w-3.5 text-primary" />}
                        {p.is_simulated && <span className="text-[10px] text-muted-foreground">seed</span>}
                      </div>
                      <span className="hidden truncate text-xs text-muted-foreground lg:block">{p.email || p.phone || "—"}</span>
                      <span className="hidden truncate text-xs text-muted-foreground lg:block">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</span>
                      <span className="hidden text-xs text-muted-foreground lg:block">{p.gender || "—"}</span>
                      <span className={`text-xs ${p.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>{p.is_active ? "active" : "hidden"}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {filteredProfiles.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users found.</p>}
                </div>
              </div>
            </Section>
          )}

          {tab === "matches" && (
            <Section title="Recent matches" subtitle={`${matches.length} pairs`}>
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {matches.map(m => {
                  const a = profiles.find(x => x.id === m.user_a);
                  const b = profiles.find(x => x.id === m.user_b);
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-sm last:border-b-0">
                      <span className="flex items-center gap-2 truncate">
                        <Heart className="h-3.5 w-3.5 text-primary" />
                        <strong className="truncate">{a?.display_name ?? m.user_a.slice(0, 8)}</strong>
                        <span className="text-muted-foreground">×</span>
                        <strong className="truncate">{b?.display_name ?? m.user_b.slice(0, 8)}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                  );
                })}
                {matches.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No matches yet.</p>}
              </div>
            </Section>
          )}

          {tab === "locations" && (
            <Section title="User locations" subtitle="Auto-reported when users open the app (with their permission)">
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {locations.map(l => {
                  const u = profiles.find(p => p.id === l.user_id);
                  return (
                    <div key={l.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0">
                      <div className="truncate">
                        <strong>{u?.display_name ?? l.user_id.slice(0, 8)}</strong>
                        <span className="ml-2 text-muted-foreground">{[l.city, l.country].filter(Boolean).join(", ") || `${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)}`}</span>
                      </div>
                      <a className="text-xs text-primary hover:underline" target="_blank" rel="noreferrer"
                         href={`https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=12/${l.latitude}/${l.longitude}`}>
                        View map · {new Date(l.created_at).toLocaleDateString()}
                      </a>
                    </div>
                  );
                })}
                {locations.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No location reports yet.</p>}
              </div>
            </Section>
          )}

          {tab === "mpesa" && mpesa && (
            <Section title="M-Pesa Daraja" subtitle="Paybill M-Pesa Express (STK Push) premium unlocks. Disable to hide it from users.">
              <Toggle label="Enable M-Pesa premium payments" checked={!!mpesa.is_active} onChange={v => setMpesa({ ...mpesa, is_active: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Environment"><Select value={mpesa.environment ?? "sandbox"} onValueChange={v => setMpesa({ ...mpesa, environment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent></Select></Field>
                <Field label="Premium amount (KES)"><Input type="number" min={1} value={mpesa.amount ?? 1} onChange={e => setMpesa({ ...mpesa, amount: e.target.value })} /></Field>
                <Field label="Consumer key"><Input value={mpesa.consumer_key ?? ""} onChange={e => setMpesa({ ...mpesa, consumer_key: e.target.value })} /></Field>
                <Field label="Consumer secret"><Input type="password" value={mpesa.consumer_secret ?? ""} onChange={e => setMpesa({ ...mpesa, consumer_secret: e.target.value })} /></Field>
                <Field label="Pass key"><Input type="password" value={mpesa.pass_key ?? ""} onChange={e => setMpesa({ ...mpesa, pass_key: e.target.value })} /></Field>
                <Field label="Paybill shortcode"><Input value={mpesa.shortcode ?? ""} onChange={e => setMpesa({ ...mpesa, shortcode: e.target.value })} /></Field>
                <Field label="Account reference"><Input value={mpesa.account_reference ?? "Premium"} onChange={e => setMpesa({ ...mpesa, account_reference: e.target.value })} /></Field>
                <Field label="Transaction description"><Input value={mpesa.description ?? "Premium unlock"} onChange={e => setMpesa({ ...mpesa, description: e.target.value })} /></Field>
              </div>
              <Button onClick={saveMpesa} className="gradient-primary text-primary-foreground">Save M-Pesa</Button>
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {payments.map(p => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0"><span>{p.phone} · KES {p.amount} · {p.status}</span><span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span></div>)}
                {payments.length === 0 && <p className="p-4 text-sm text-muted-foreground">No M-Pesa payments yet.</p>}
              </div>
            </Section>
          )}

          {tab === "packages" && (
            <Section title="Premium packages" subtitle="Define the plans users can buy via M-Pesa">
              <div className="grid gap-3 md:grid-cols-2">
                {packages.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-background p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.name} {p.is_popular && <Badge className="ml-1">Popular</Badge>}</p>
                        <p className="text-xs text-muted-foreground">KES {p.amount} · {p.duration_days} days</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => delPackage(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Field label="Name"><Input value={p.name} onChange={e => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, name: e.target.value } : x))} /></Field>
                    <Field label="Description"><Textarea rows={2} value={p.description ?? ""} onChange={e => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, description: e.target.value } : x))} /></Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Amount KES"><Input type="number" value={p.amount} onChange={e => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, amount: e.target.value } : x))} /></Field>
                      <Field label="Days"><Input type="number" value={p.duration_days} onChange={e => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, duration_days: e.target.value } : x))} /></Field>
                    </div>
                    <Field label="Features (comma separated)"><Input value={Array.isArray(p.features) ? p.features.join(", ") : p.features ?? ""} onChange={e => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, features: e.target.value } : x))} /></Field>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm"><Switch checked={!!p.is_popular} onCheckedChange={v => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, is_popular: v } : x))} /> Popular</label>
                      <label className="flex items-center gap-2 text-sm"><Switch checked={p.is_active !== false} onCheckedChange={v => setPackages(packages.map((x: any) => x.id === p.id ? { ...x, is_active: v } : x))} /> Active</label>
                    </div>
                    <Button size="sm" onClick={() => savePackage(p)} className="gradient-primary text-primary-foreground w-full"><CheckCircle2 className="mr-1 h-4 w-4" /> Save</Button>
                  </div>
                ))}

                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-2">
                  <p className="font-semibold">Add new package</p>
                  <Field label="Name"><Input value={newPkg.name} onChange={e => setNewPkg({ ...newPkg, name: e.target.value })} /></Field>
                  <Field label="Description"><Textarea rows={2} value={newPkg.description} onChange={e => setNewPkg({ ...newPkg, description: e.target.value })} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Amount KES"><Input type="number" value={newPkg.amount} onChange={e => setNewPkg({ ...newPkg, amount: Number(e.target.value) })} /></Field>
                    <Field label="Days"><Input type="number" value={newPkg.duration_days} onChange={e => setNewPkg({ ...newPkg, duration_days: Number(e.target.value) })} /></Field>
                  </div>
                  <Field label="Features (comma separated)"><Input value={newPkg.features} onChange={e => setNewPkg({ ...newPkg, features: e.target.value })} /></Field>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={newPkg.is_popular} onCheckedChange={v => setNewPkg({ ...newPkg, is_popular: v })} /> Popular</label>
                  <Button size="sm" onClick={() => savePackage(newPkg)} className="gradient-primary text-primary-foreground w-full"><Plus className="mr-1 h-4 w-4" /> Add</Button>
                </div>
              </div>
            </Section>
          )}

          {tab === "requests" && (
            <Section title="Connection requests" subtitle="Users asking the concierge to connect them with a match">
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {requests.map(r => {
                  const u = profiles.find(p => p.id === r.user_id);
                  const t = profiles.find(p => p.id === r.target_id);
                  return (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium"><strong>{u?.display_name ?? r.user_id.slice(0, 8)}</strong> wants to connect with <strong>{t?.display_name ?? r.target_id.slice(0, 8)}</strong></p>
                        <p className="text-xs text-muted-foreground">{u?.email || u?.phone || "—"} → {t?.email || t?.phone || "—"} · {new Date(r.created_at).toLocaleString()}</p>
                        {r.message && <p className="mt-1 text-xs italic">"{r.message}"</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "outline"}>{r.status}</Badge>
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => resolveRequest(r, "approved")}><MessageCircle className="mr-1 h-4 w-4" /> Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => resolveRequest(r, "declined")}>Decline</Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {requests.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No connection requests yet.</p>}
              </div>
            </Section>
          )}

          {tab === "ads" && (
            <Section title="Custom ads" subtitle="Banner or floating ads on Discover. Users click to earn bonus swipes — your monetization core.">
              <Toggle label="Ads enabled site-wide" checked={s.ads_enabled !== false} onChange={v => { setS({ ...s, ads_enabled: v }); }} />
              <div className="flex justify-end"><Button size="sm" variant="outline" onClick={saveSettings}>Save toggle</Button></div>

              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create new ad</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Title"><Input value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} /></Field>
                  <Field label="Placement">
                    <Select value={newAd.placement} onValueChange={v => setNewAd({ ...newAd, placement: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banner">Banner (top of Discover)</SelectItem>
                        <SelectItem value="floating">Floating (bottom-right)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Body / description"><Textarea rows={2} value={newAd.body} onChange={e => setNewAd({ ...newAd, body: e.target.value })} /></Field>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="CTA text"><Input value={newAd.cta_text} onChange={e => setNewAd({ ...newAd, cta_text: e.target.value })} /></Field>
                  <Field label="Reward swipes"><Input type="number" value={newAd.reward_swipes} onChange={e => setNewAd({ ...newAd, reward_swipes: Number(e.target.value) })} /></Field>
                  <Field label="Weight (priority)"><Input type="number" value={newAd.weight} onChange={e => setNewAd({ ...newAd, weight: Number(e.target.value) })} /></Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Image URL (optional)"><Input value={newAd.image_url} onChange={e => setNewAd({ ...newAd, image_url: e.target.value })} placeholder="https://…" /></Field>
                  <Field label="Video URL (optional)"><Input value={newAd.video_url} onChange={e => setNewAd({ ...newAd, video_url: e.target.value })} placeholder="https://… .mp4" /></Field>
                  <Field label="Link URL (optional)"><Input value={newAd.link_url} onChange={e => setNewAd({ ...newAd, link_url: e.target.value })} /></Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Target countries (comma sep, blank = all)">
                    <Input
                      value={Array.isArray(newAd.target_countries) ? newAd.target_countries.join(", ") : (newAd.target_countries ?? "")}
                      onChange={e => setNewAd({ ...newAd, target_countries: e.target.value })}
                      placeholder="Kenya, Uganda"
                    />
                  </Field>
                  <Field label="Skip after (seconds)">
                    <Input type="number" min={0} value={newAd.skip_after_seconds} onChange={e => setNewAd({ ...newAd, skip_after_seconds: Number(e.target.value) })} />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm"><Switch checked={newAd.is_skippable !== false} onCheckedChange={v => setNewAd({ ...newAd, is_skippable: v })} /> Skippable</label>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Campaign type">
                    <Select value={newAd.campaign_type} onValueChange={v => setNewAd({ ...newAd, campaign_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reward">Reward (bonus swipes)</SelectItem>
                        <SelectItem value="traffic">Traffic (drive clicks)</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="awareness">Awareness</SelectItem>
                        <SelectItem value="leads">Lead generation (form)</SelectItem>
                        <SelectItem value="app_promotion">App promotion</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="App Store URL (iOS)"><Input value={newAd.app_store_url} onChange={e => setNewAd({ ...newAd, app_store_url: e.target.value })} placeholder="https://apps.apple.com/…" /></Field>
                  <Field label="Play Store URL (Android)"><Input value={newAd.play_store_url} onChange={e => setNewAd({ ...newAd, play_store_url: e.target.value })} placeholder="https://play.google.com/…" /></Field>
                </div>
                {newAd.campaign_type === "leads" && (
                  <Field label='Form fields (JSON array). Default: name+email+phone. Example: [{"name":"name","label":"Full name","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true}]'>
                    <Textarea rows={3} className="font-mono text-xs" value={newAd.form_fields} onChange={e => setNewAd({ ...newAd, form_fields: e.target.value })} />
                  </Field>
                )}
                <label className="flex items-center gap-2 text-sm"><Switch checked={newAd.open_in_new_tab !== false} onCheckedChange={v => setNewAd({ ...newAd, open_in_new_tab: v })} /> Open link in new browser tab</label>
                <Button size="sm" onClick={() => saveAd(newAd)} className="gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Create ad</Button>
              </div>

              {/* Analytics */}
              {adStats.length > 0 && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="mb-3 font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Ad performance</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="px-2 py-2 text-left">Ad</th>
                          <th className="px-2 py-2 text-right">Impressions</th>
                          <th className="px-2 py-2 text-right">Clicks</th>
                          <th className="px-2 py-2 text-right">CTR</th>
                          <th className="px-2 py-2 text-right">Swipes granted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adStats.map((r: any) => (
                          <tr key={r.ad_id} className="border-b border-border last:border-0">
                            <td className="px-2 py-2"><span className="font-medium">{r.title}</span> <Badge variant="secondary" className="ml-1">{r.placement}</Badge></td>
                            <td className="px-2 py-2 text-right tabular-nums">{r.impressions}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{r.clicks}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{r.ctr}%</td>
                            <td className="px-2 py-2 text-right tabular-nums">{r.swipes_granted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {ads.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-border bg-background p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold flex items-center gap-2">
                          {a.video_url ? <Video className="h-4 w-4 text-primary" /> : a.image_url ? <ImageIcon className="h-4 w-4 text-primary" /> : <Megaphone className="h-4 w-4 text-primary" />}
                          {a.title}
                          <Badge variant="secondary">{a.placement}</Badge>
                          {!a.is_active && <Badge variant="outline">paused</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">+{a.reward_swipes} swipes · weight {a.weight}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={a.is_active !== false} onCheckedChange={v => setAds(ads.map(x => x.id === a.id ? { ...x, is_active: v } : x))} />
                        <Button size="icon" variant="ghost" onClick={() => delAd(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Title"><Input value={a.title} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, title: e.target.value } : x))} /></Field>
                      <Field label="CTA"><Input value={a.cta_text ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, cta_text: e.target.value } : x))} /></Field>
                    </div>
                    <Field label="Body"><Textarea rows={2} value={a.body ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, body: e.target.value } : x))} /></Field>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Field label="Image URL"><Input value={a.image_url ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, image_url: e.target.value } : x))} /></Field>
                      <Field label="Video URL"><Input value={a.video_url ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, video_url: e.target.value } : x))} /></Field>
                      <Field label="Link URL"><Input value={a.link_url ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, link_url: e.target.value } : x))} /></Field>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Field label="Reward swipes"><Input type="number" value={a.reward_swipes} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, reward_swipes: Number(e.target.value) } : x))} /></Field>
                      <Field label="Weight"><Input type="number" value={a.weight} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, weight: Number(e.target.value) } : x))} /></Field>
                      <Field label="Placement">
                        <Select value={a.placement} onValueChange={v => setAds(ads.map(x => x.id === a.id ? { ...x, placement: v } : x))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="banner">Banner</SelectItem>
                            <SelectItem value="floating">Floating</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Field label="Target countries (comma sep)">
                        <Input
                          value={Array.isArray(a.target_countries) ? a.target_countries.join(", ") : (a.target_countries ?? "")}
                          onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, target_countries: e.target.value } : x))}
                          placeholder="Kenya, Uganda"
                        />
                      </Field>
                      <Field label="Skip after (s)">
                        <Input type="number" min={0} value={a.skip_after_seconds ?? 5} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, skip_after_seconds: Number(e.target.value) } : x))} />
                      </Field>
                      <label className="flex items-end gap-2 pb-2 text-sm">
                        <Switch checked={a.is_skippable !== false} onCheckedChange={v => setAds(ads.map(x => x.id === a.id ? { ...x, is_skippable: v } : x))} /> Skippable
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Field label="Campaign type">
                        <Select value={a.campaign_type || "reward"} onValueChange={v => setAds(ads.map(x => x.id === a.id ? { ...x, campaign_type: v } : x))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reward">Reward</SelectItem>
                            <SelectItem value="traffic">Traffic</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                            <SelectItem value="awareness">Awareness</SelectItem>
                            <SelectItem value="leads">Leads</SelectItem>
                            <SelectItem value="app_promotion">App promotion</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="App Store URL"><Input value={a.app_store_url ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, app_store_url: e.target.value } : x))} /></Field>
                      <Field label="Play Store URL"><Input value={a.play_store_url ?? ""} onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, play_store_url: e.target.value } : x))} /></Field>
                    </div>
                    {a.campaign_type === "leads" && (
                      <Field label="Form fields (JSON)">
                        <Textarea rows={3} className="font-mono text-xs"
                          value={typeof a.form_fields === "string" ? a.form_fields : JSON.stringify(a.form_fields ?? [], null, 2)}
                          onChange={e => setAds(ads.map(x => x.id === a.id ? { ...x, form_fields: e.target.value } : x))} />
                      </Field>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={a.open_in_new_tab !== false} onCheckedChange={v => setAds(ads.map(x => x.id === a.id ? { ...x, open_in_new_tab: v } : x))} />
                      Open link in new browser tab
                    </label>
                    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Preview ({a.placement})</p>
                      <div className="flex items-center gap-3">
                        {a.image_url && <img src={a.image_url} className="h-12 w-12 rounded-lg object-cover" alt="" />}
                        {a.video_url && !a.image_url && <video src={a.video_url} muted autoPlay loop playsInline className="h-12 w-12 rounded-lg object-cover" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{a.title || "Untitled"}</p>
                          {a.body && <p className="truncate text-xs text-muted-foreground">{a.body}</p>}
                        </div>
                        <span className="shrink-0 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground">{a.cta_text || `+${a.reward_swipes} swipes`}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => saveAd(a)} className="gradient-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-4 w-4" /> Save</Button>
                  </div>
                ))}
                {ads.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No ads yet. Create your first one above.</p>}
              </div>
            </Section>
          )}

          {tab === "leads" && (
            <Section title="Ad leads" subtitle={`${leads.length} captured leads from your Lead-gen ads.`}>
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {leads.map(l => {
                  const ad = ads.find(a => a.id === l.ad_id);
                  return (
                    <div key={l.id} className="border-b border-border p-3 text-sm last:border-0">
                      <div className="flex items-center justify-between">
                        <strong>{l.name || l.email || l.phone || "Anonymous"}</strong>
                        <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{ad?.title ?? l.ad_id.slice(0,8)} · {l.email ?? "—"} · {l.phone ?? "—"}</p>
                      {Object.keys(l.answers ?? {}).length > 0 && (
                        <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-[11px]">{JSON.stringify(l.answers, null, 2)}</pre>
                      )}
                    </div>
                  );
                })}
                {leads.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No leads yet.</p>}
              </div>
            </Section>
          )}

          {tab === "products" && (
            <Section title="Shop products" subtitle="Items shown on the public Shop page. Set stock to 0 to hide buying.">
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add product</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Name"><Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} /></Field>
                  <Field label="Category"><Input value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Electronics, Fashion…" /></Field>
                </div>
                <Field label="Description"><Textarea rows={2} value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} /></Field>
                <div className="grid gap-2 sm:grid-cols-4">
                  <Field label="Price (KES)"><Input type="number" value={newProduct.price_kes} onChange={e => setNewProduct({ ...newProduct, price_kes: e.target.value })} /></Field>
                  <Field label="Stock"><Input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} /></Field>
                  <Field label="Sort"><Input type="number" value={newProduct.sort_order} onChange={e => setNewProduct({ ...newProduct, sort_order: e.target.value })} /></Field>
                  <Field label="Image URL"><Input value={newProduct.image_url} onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })} /></Field>
                </div>
                <Button size="sm" onClick={() => saveProduct(newProduct)} className="gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Add product</Button>
              </div>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {p.image_url && <img src={p.image_url} className="h-14 w-14 rounded-lg object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{p.name} <Badge variant="secondary">KES {p.price_kes}</Badge></p>
                        <p className="text-xs text-muted-foreground truncate">{p.category} · stock {p.stock}</p>
                      </div>
                      <Switch checked={p.is_active} onCheckedChange={v => setProducts(products.map(x => x.id === p.id ? { ...x, is_active: v } : x))} />
                      <Button size="icon" variant="ghost" onClick={() => delProduct(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Name"><Input value={p.name} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} /></Field>
                      <Field label="Image URL"><Input value={p.image_url ?? ""} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, image_url: e.target.value } : x))} /></Field>
                    </div>
                    <Field label="Description"><Textarea rows={2} value={p.description ?? ""} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, description: e.target.value } : x))} /></Field>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <Field label="Price"><Input type="number" value={p.price_kes} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, price_kes: e.target.value } : x))} /></Field>
                      <Field label="Stock"><Input type="number" value={p.stock} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, stock: e.target.value } : x))} /></Field>
                      <Field label="Category"><Input value={p.category ?? ""} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, category: e.target.value } : x))} /></Field>
                      <Field label="Sort"><Input type="number" value={p.sort_order} onChange={e => setProducts(products.map(x => x.id === p.id ? { ...x, sort_order: e.target.value } : x))} /></Field>
                    </div>
                    <Button size="sm" onClick={() => saveProduct(p)} className="gradient-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-4 w-4" /> Save</Button>
                  </div>
                ))}
                {products.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No products yet.</p>}
              </div>
            </Section>
          )}

          {tab === "orders" && (
            <Section title="Shop orders" subtitle={`${orders.length} orders. Move them through paid → shipped → delivered.`}>
              <div className="space-y-2">
                {orders.map(o => (
                  <div key={o.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">#{o.id.slice(0,8).toUpperCase()} · <span className="text-primary">KES {o.total_kes.toLocaleString()}</span></p>
                        <p className="text-xs text-muted-foreground">{o.full_name} · {o.phone} · {[o.town, o.sub_county, o.county].filter(Boolean).join(", ")}</p>
                        {o.address && <p className="text-xs text-muted-foreground">{o.address}</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                      </div>
                      <Badge className="capitalize">{o.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["paid","shipped","delivered","cancelled"].map(st => (
                        <Button key={st} size="sm" variant={o.status === st ? "default" : "outline"} onClick={() => updateOrderStatus(o, st)}>
                          {st === "paid" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {st === "shipped" && <Truck className="mr-1 h-3 w-3" />}
                          {st === "delivered" && <Home className="mr-1 h-3 w-3" />}
                          {st === "cancelled" && <X className="mr-1 h-3 w-3" />}
                          Mark {st}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>}
              </div>
            </Section>
          )}


          {tab === "seo" && (
            <Section title="SEO & Search Console" subtitle="Meta tags, favicon, Google site verification and sitemap.">
              <Field label="Meta title"><Input value={s.meta_title ?? ""} onChange={e => setS({ ...s, meta_title: e.target.value })} placeholder="HeartLink — Modern Dating" /></Field>
              <Field label="Meta description"><Textarea rows={2} value={s.meta_description ?? ""} onChange={e => setS({ ...s, meta_description: e.target.value })} /></Field>
              <Field label="Meta keywords"><Input value={s.meta_keywords ?? ""} onChange={e => setS({ ...s, meta_keywords: e.target.value })} placeholder="dating, love, mature singles" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Canonical URL"><Input value={s.canonical_url ?? ""} onChange={e => setS({ ...s, canonical_url: e.target.value })} placeholder="https://yourdomain.com/" /></Field>
                <Field label="OG / social image URL"><Input value={s.og_image_url ?? ""} onChange={e => setS({ ...s, og_image_url: e.target.value })} /></Field>
                <Field label="Favicon URL"><Input value={s.favicon_url ?? ""} onChange={e => setS({ ...s, favicon_url: e.target.value })} placeholder="https://…/favicon.png" /></Field>
                <Field label="Google site verification">
                  <Input value={s.google_site_verification ?? ""} onChange={e => setS({ ...s, google_site_verification: e.target.value })} placeholder="paste the content value from Google" />
                </Field>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Sitemap:</strong> <a className="text-primary hover:underline" href="/sitemap.xml" target="_blank" rel="noreferrer">/sitemap.xml</a> — submit this URL in Google Search Console.</p>
                <p><strong>Robots:</strong> <a className="text-primary hover:underline" href="/robots.txt" target="_blank" rel="noreferrer">/robots.txt</a> — already references your sitemap.</p>
                <p>To verify with Google: paste the <em>content</em> value from your verification meta tag (the token only, not full HTML) and save. The tag is injected on every page.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save SEO</Button>
                <Button variant="outline" onClick={async () => {
                  await saveSettings();
                  const base = (s.canonical_url || window.location.origin).replace(/\/$/, "");
                  const urls = ["/", "/discover", "/matches", "/connect", "/auth", "/install"].map(p =>
                    `  <url>\n    <loc>${base}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === "/" ? "1.0" : "0.7"}</priority>\n  </url>`
                  ).join("\n");
                  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
                  const blob = new Blob([xml], { type: "application/xml" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob); a.download = "sitemap.xml"; a.click();
                  toast.success("Sitemap regenerated — upload to /public/sitemap.xml");
                }}>Regenerate sitemap.xml</Button>
                <Button variant="ghost" onClick={() => { document.title = s.meta_title || s.site_name; toast.success("Metadata re-applied"); }}>
                  Reapply metadata
                </Button>
              </div>
            </Section>
          )}
        </main>
      </div>

      {/* Profile drawer */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={() => setActiveProfile(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{activeProfile.display_name}{activeProfile.age ? `, ${activeProfile.age}` : ""}</h3>
                <p className="text-sm text-muted-foreground">{[activeProfile.city, activeProfile.country].filter(Boolean).join(", ")}</p>
              </div>
              <button onClick={() => setActiveProfile(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            {(() => {
              const lastLoc = locations.find(l => l.user_id === activeProfile.id);
              if (!lastLoc) return null;
              return (
                <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-reported location</p>
                  <p className="font-medium">{[lastLoc.city, lastLoc.country].filter(Boolean).join(", ") || `${lastLoc.latitude.toFixed(4)}, ${lastLoc.longitude.toFixed(4)}`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(lastLoc.created_at).toLocaleString()} · accuracy {Math.round(lastLoc.accuracy ?? 0)}m</p>
                  <a className="text-xs text-primary hover:underline" target="_blank" rel="noreferrer"
                     href={`https://www.openstreetmap.org/?mlat=${lastLoc.latitude}&mlon=${lastLoc.longitude}#map=14/${lastLoc.latitude}/${lastLoc.longitude}`}>Open map →</a>
                </div>
              );
            })()}
            {activeProfile.photos?.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto">
                {activeProfile.photos.map((p: string) => <img key={p} src={p} className="h-32 w-24 rounded-xl object-cover" />)}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Email", activeProfile.email],
                ["Phone", activeProfile.phone],
                ["Gender", activeProfile.gender], ["Orientation", activeProfile.orientation],
                ["Interested in", activeProfile.interested_in], ["Religion", activeProfile.religion],
                ["Ethnicity", activeProfile.ethnicity], ["Education", activeProfile.education],
                ["Relationship goal", activeProfile.relationship_goals], ["Financial", activeProfile.financial_status],
                ["Smoking", activeProfile.smoking], ["Drinking", activeProfile.drinking],
                ["Children", activeProfile.has_children],
                ["Country", activeProfile.country], ["City", activeProfile.city],
                ["Lat/Lon", activeProfile.latitude ? `${activeProfile.latitude.toFixed(3)}, ${activeProfile.longitude?.toFixed(3)}` : null],
                ["Premium", activeProfile.is_premium ? "Yes" : "No"],
                ["Joined", activeProfile.created_at ? new Date(activeProfile.created_at).toLocaleDateString() : null],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k as string} className="rounded-lg border border-border bg-background px-3 py-2">
                  <dt className="text-[10px] uppercase text-muted-foreground">{k}</dt>
                  <dd className="truncate font-medium">{v as string}</dd>
                </div>
              ))}
            </dl>
            {activeProfile.bio && <p className="mt-4 text-sm text-muted-foreground">{activeProfile.bio}</p>}
            {(activeProfile.interests?.length || activeProfile.conditions?.length) ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(activeProfile.interests ?? []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                {(activeProfile.conditions ?? []).map((t: string) => <Badge key={t} className="bg-primary/80">{t.replace(/-/g, " ")}</Badge>)}
              </div>
            ) : null}
            {!activeProfile.is_simulated && (
              <div className="mt-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-xs">Days</Label>
                  <Input type="number" min={1} value={grantDays} onChange={e => setGrantDays(Number(e.target.value) || 30)} className="h-9 w-20" />
                  <Button size="sm" onClick={() => togglePremium(activeProfile.id, true, grantDays)}>
                    <Crown className="mr-1 h-4 w-4" /> Grant {grantDays}d premium
                  </Button>
                  {activeProfile.is_premium && (
                    <Button size="sm" variant="outline" onClick={() => togglePremium(activeProfile.id, false)}>
                      Revoke premium
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => toggleActive(activeProfile.id, !activeProfile.is_active)}>
                    {activeProfile.is_active ? "Hide profile" : "Activate"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block">{label}</Label>{children}</div>;
}
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <div><p className="font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${accent ? "ring-1 ring-primary/30" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default Admin;
