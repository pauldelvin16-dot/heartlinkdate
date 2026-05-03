import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Crown, Send } from "lucide-react";

const Admin = () => {
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [smtp, setSmtp] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [newC, setNewC] = useState({ label: "", whatsapp: "", email: "", phone: "", notes: "" });
  const [testTo, setTestTo] = useState("");

  useEffect(() => { reload(); }, []);
  async function reload() {
    const [s1, smtp1, c1, p1, m1, t1] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("smtp_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("premium_contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name,country,is_simulated,is_active,is_premium,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("email_templates").select("*").order("key"),
    ]);
    setS(s1.data); setSmtp(smtp1.data); setContacts(c1.data ?? []);
    setProfiles(p1.data ?? []); setMatches(m1.data ?? []); setTemplates(t1.data ?? []);
  }

  async function saveSettings() {
    const { error } = await supabase.from("site_settings").update({
      site_name: s.site_name, tagline: s.tagline, logo_url: s.logo_url,
      contact_email: s.contact_email, contact_whatsapp: s.contact_whatsapp,
      premium_message: s.premium_message,
      enable_otp_login: !!s.enable_otp_login, enable_2fa_email: !!s.enable_2fa_email,
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
    toast.success("You're now admin. Reloading…");
    setTimeout(() => location.reload(), 800);
  }

  async function togglePremium(profileId: string, makePremium: boolean) {
    if (makePremium) {
      const { error } = await supabase.from("premium_subscriptions").insert({ user_id: profileId, plan: "premium", status: "active" });
      if (error) return toast.error(error.message);
    } else {
      await supabase.from("premium_subscriptions").update({ status: "cancelled" }).eq("user_id", profileId).eq("status", "active");
    }
    toast.success("Updated"); reload();
  }

  async function saveTemplate(t: any) {
    const { error } = await supabase.from("email_templates").update({ subject: t.subject, html: t.html, is_active: t.is_active, updated_at: new Date().toISOString() }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
  }

  if (!s) return (
    <div className="container py-10">
      <p className="text-muted-foreground">Loading admin… If you're the first user, claim admin access:</p>
      <Button onClick={makeMeAdmin} className="mt-3 gradient-primary text-primary-foreground"><Crown className="mr-2 h-4 w-4" /> Claim admin</Button>
    </div>
  );

  return (
    <div className="container max-w-5xl py-6 pb-24 md:pb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin</h1>
          <p className="text-muted-foreground">Configure everything about your site.</p>
        </div>
        <Shield className="h-6 w-6 text-primary" />
      </div>
      <Tabs defaultValue="site">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="contacts">Connectors</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5">
          <Field label="Site name"><Input value={s.site_name ?? ""} onChange={e => setS({ ...s, site_name: e.target.value })} /></Field>
          <Field label="Tagline"><Input value={s.tagline ?? ""} onChange={e => setS({ ...s, tagline: e.target.value })} /></Field>
          <Field label="Logo URL"><Input value={s.logo_url ?? ""} onChange={e => setS({ ...s, logo_url: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Contact email"><Input value={s.contact_email ?? ""} onChange={e => setS({ ...s, contact_email: e.target.value })} /></Field>
          <Field label="Contact WhatsApp"><Input value={s.contact_whatsapp ?? ""} onChange={e => setS({ ...s, contact_whatsapp: e.target.value })} /></Field>
          <Field label="Premium connect message"><Textarea value={s.premium_message ?? ""} onChange={e => setS({ ...s, premium_message: e.target.value })} /></Field>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div><p className="font-medium">Allow OTP email login</p><p className="text-xs text-muted-foreground">Users can sign in with a one-time code.</p></div>
            <Switch checked={!!s.enable_otp_login} onCheckedChange={v => setS({ ...s, enable_otp_login: v })} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div><p className="font-medium">Optional 2FA via email</p><p className="text-xs text-muted-foreground">Users can opt in to email 2FA.</p></div>
            <Switch checked={!!s.enable_2fa_email} onCheckedChange={v => setS({ ...s, enable_2fa_email: v })} />
          </div>
          <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save</Button>
        </TabsContent>

        <TabsContent value="smtp" className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Configure your SMTP server. We use nodemailer with TLS 1.2+ and verified handshake. STARTTLS for port 587, SSL for 465.</p>
          {smtp && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Host"><Input value={smtp.host ?? ""} onChange={e => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" /></Field>
                <Field label="Port"><Input type="number" value={smtp.port ?? 587} onChange={e => setSmtp({ ...smtp, port: e.target.value })} /></Field>
                <Field label="Username"><Input value={smtp.username ?? ""} onChange={e => setSmtp({ ...smtp, username: e.target.value })} /></Field>
                <Field label="Password"><Input type="password" value={smtp.password ?? ""} onChange={e => setSmtp({ ...smtp, password: e.target.value })} /></Field>
                <Field label="From name"><Input value={smtp.from_name ?? ""} onChange={e => setSmtp({ ...smtp, from_name: e.target.value })} /></Field>
                <Field label="From email"><Input type="email" value={smtp.from_email ?? ""} onChange={e => setSmtp({ ...smtp, from_email: e.target.value })} /></Field>
                <Field label="Reply-to (optional)"><Input value={smtp.reply_to ?? ""} onChange={e => setSmtp({ ...smtp, reply_to: e.target.value })} /></Field>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!smtp.secure} onCheckedChange={v => setSmtp({ ...smtp, secure: v })} />
                <span className="text-sm">SSL (port 465). Off = STARTTLS (587).</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!smtp.is_active} onCheckedChange={v => setSmtp({ ...smtp, is_active: v })} />
                <span className="text-sm">Enable email sending</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveSmtp} className="gradient-primary text-primary-foreground">Save SMTP</Button>
                <Input className="max-w-xs" placeholder="test@you.com" value={testTo} onChange={e => setTestTo(e.target.value)} />
                <Button variant="outline" onClick={sendTest}><Send className="mr-1.5 h-4 w-4" /> Send test welcome email</Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="emails" className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Edit the email templates. Variables supported: <code>{"{{site_name}} {{name}} {{site_url}} {{reset_url}} {{code}}"}</code></p>
          {templates.map((t, i) => (
            <div key={t.id} className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t.key}</p>
                <Switch checked={!!t.is_active} onCheckedChange={v => { const n = [...templates]; n[i] = { ...t, is_active: v }; setTemplates(n); }} />
              </div>
              <Input value={t.subject} onChange={e => { const n = [...templates]; n[i] = { ...t, subject: e.target.value }; setTemplates(n); }} />
              <Textarea rows={6} className="font-mono text-xs" value={t.html} onChange={e => { const n = [...templates]; n[i] = { ...t, html: e.target.value }; setTemplates(n); }} />
              <Button size="sm" onClick={() => saveTemplate(templates[i])}>Save</Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Add connector / moderator contact</h3>
          <p className="text-xs text-muted-foreground">Connectors are admins/moderators who handle premium upgrades for matched users.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Label" value={newC.label} onChange={e => setNewC({ ...newC, label: e.target.value })} />
            <Input placeholder="WhatsApp +44…" value={newC.whatsapp} onChange={e => setNewC({ ...newC, whatsapp: e.target.value })} />
            <Input placeholder="Email" value={newC.email} onChange={e => setNewC({ ...newC, email: e.target.value })} />
            <Input placeholder="Phone" value={newC.phone} onChange={e => setNewC({ ...newC, phone: e.target.value })} />
          </div>
          <Textarea placeholder="Notes shown to user" value={newC.notes} onChange={e => setNewC({ ...newC, notes: e.target.value })} />
          <Button onClick={addContact}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          <div className="mt-4 space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="text-sm"><strong>{c.label}</strong> · {c.whatsapp ?? c.email ?? c.phone}</div>
                <Button size="icon" variant="ghost" onClick={() => delContact(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-sm text-muted-foreground">{profiles.length} profiles · click to grant/revoke premium</p>
          <div className="max-h-[28rem] space-y-1 overflow-auto">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-border py-1.5 text-sm">
                <span className="flex items-center gap-2">{p.is_premium && <Crown className="h-3.5 w-3.5 text-primary" />} {p.display_name} {p.is_simulated && <span className="text-xs text-muted-foreground">(seed)</span>}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{p.country}</span>
                  {!p.is_simulated && (
                    <Button size="sm" variant={p.is_premium ? "outline" : "default"} onClick={() => togglePremium(p.id, !p.is_premium)}>
                      {p.is_premium ? "Revoke premium" : "Grant premium"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{matches.length} recent matches</p>
          <div className="mt-2 space-y-1 text-xs">
            {matches.map(m => <div key={m.id} className="font-mono text-muted-foreground">{new Date(m.created_at).toLocaleString()} · {m.user_a.slice(0,8)} ↔ {m.user_b.slice(0,8)}</div>)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block">{label}</Label>{children}</div>;
}

export default Admin;
