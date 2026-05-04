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
import { toast } from "sonner";
import {
  Plus, Trash2, Shield, Crown, Send, Settings, Mail, FileText, Link2, Users, Heart,
  Globe2, MapPin, LogOut, Menu, X, Search, ChevronRight, Home,
} from "lucide-react";

type TabKey = "site" | "countries" | "smtp" | "emails" | "contacts" | "users" | "matches" | "locations";

const NAV: { key: TabKey; label: string; icon: any }[] = [
  { key: "site", label: "Site", icon: Settings },
  { key: "countries", label: "Countries", icon: Globe2 },
  { key: "smtp", label: "SMTP", icon: Mail },
  { key: "emails", label: "Email templates", icon: FileText },
  { key: "contacts", label: "Connectors", icon: Link2 },
  { key: "users", label: "Users", icon: Users },
  { key: "matches", label: "Matches", icon: Heart },
  { key: "locations", label: "Locations", icon: MapPin },
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
  const [search, setSearch] = useState("");
  const [activeProfile, setActiveProfile] = useState<any | null>(null);

  const [newC, setNewC] = useState({ label: "", whatsapp: "", email: "", phone: "", notes: "" });
  const [testTo, setTestTo] = useState("");
  const [newCountry, setNewCountry] = useState("");

  useEffect(() => { reload(); }, []);

  async function reload() {
    const [s1, smtp1, c1, p1, m1, t1, l1] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("smtp_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("premium_contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("email_templates").select("*").order("key"),
      supabase.from("user_locations").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setS(s1.data); setSmtp(smtp1.data); setContacts(c1.data ?? []);
    setProfiles(p1.data ?? []); setMatches(m1.data ?? []); setTemplates(t1.data ?? []);
    setLocations(l1.data ?? []);
  }

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p =>
      [p.display_name, p.country, p.city, p.gender, p.orientation, p.religion, p.id]
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
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Site settings saved");
  }
  async function saveSmtp() {
    const { error } = await supabase.from("smtp_settings").update({
      host: smtp.host, port: Number(smtp.port) || 587, secure: !!smtp.secure,
      username: smtp.username, password: smtp.password,
      from_email: smtp.from_email, from_name: smtp.from_name, reply_to: smtp.reply_to,
      is_active: !!smtp.is_active, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("SMTP saved");
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
  async function togglePremium(id: string, makePremium: boolean) {
    if (makePremium) {
      const { error } = await supabase.from("premium_subscriptions").insert({ user_id: id, plan: "premium", status: "active" });
      if (error) return toast.error(error.message);
    } else {
      await supabase.from("premium_subscriptions").update({ status: "cancelled" }).eq("user_id", id).eq("status", "active");
    }
    toast.success("Updated"); reload();
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
              <Toggle label="Use SSL (port 465)" hint="Off = STARTTLS on 587." checked={!!smtp.secure} onChange={v => setSmtp({ ...smtp, secure: v })} />
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
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground sm:grid-cols-[2fr_1fr_1fr_auto_auto]">
                  <div>Name</div><div className="hidden sm:block">Location</div><div className="hidden sm:block">Gender</div><div>Status</div><div></div>
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  {filteredProfiles.map(p => (
                    <div key={p.id} onClick={() => setActiveProfile(p)}
                      className="grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-sm transition hover:bg-muted/40 sm:grid-cols-[2fr_1fr_1fr_auto_auto]">
                      <div className="flex items-center gap-2 truncate">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-bold">{p.display_name?.[0]?.toUpperCase() ?? "?"}</div>
                        <span className="truncate font-medium">{p.display_name}</span>
                        {p.is_premium && <Crown className="h-3.5 w-3.5 text-primary" />}
                        {p.is_simulated && <span className="text-[10px] text-muted-foreground">seed</span>}
                      </div>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</span>
                      <span className="hidden text-xs text-muted-foreground sm:block">{p.gender || "—"}</span>
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
            {activeProfile.photos?.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto">
                {activeProfile.photos.map((p: string) => <img key={p} src={p} className="h-32 w-24 rounded-xl object-cover" />)}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Gender", activeProfile.gender], ["Orientation", activeProfile.orientation],
                ["Interested in", activeProfile.interested_in], ["Religion", activeProfile.religion],
                ["Ethnicity", activeProfile.ethnicity], ["Education", activeProfile.education],
                ["Relationship goal", activeProfile.relationship_goals], ["Financial", activeProfile.financial_status],
                ["Smoking", activeProfile.smoking], ["Drinking", activeProfile.drinking],
                ["Children", activeProfile.has_children], ["Phone", activeProfile.phone],
                ["Lat/Lon", activeProfile.latitude ? `${activeProfile.latitude.toFixed(3)}, ${activeProfile.longitude?.toFixed(3)}` : null],
                ["Premium", activeProfile.is_premium ? "Yes" : "No"],
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
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" variant={activeProfile.is_premium ? "outline" : "default"}
                  onClick={() => togglePremium(activeProfile.id, !activeProfile.is_premium)}>
                  <Crown className="mr-1 h-4 w-4" /> {activeProfile.is_premium ? "Revoke premium" : "Grant premium"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(activeProfile.id, !activeProfile.is_active)}>
                  {activeProfile.is_active ? "Hide profile" : "Activate"}
                </Button>
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
