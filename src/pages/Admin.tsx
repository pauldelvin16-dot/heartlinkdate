import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Crown } from "lucide-react";

const Admin = () => {
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [newC, setNewC] = useState({ label: "", whatsapp: "", email: "", phone: "", notes: "" });

  useEffect(() => { reload(); }, []);
  async function reload() {
    const [s1, c1, p1, m1] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("premium_contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name,country,is_simulated,is_active,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setS(s1.data); setContacts(c1.data ?? []); setProfiles(p1.data ?? []); setMatches(m1.data ?? []);
  }

  async function saveSettings() {
    const { error } = await supabase.from("site_settings").update({
      site_name: s.site_name, tagline: s.tagline, logo_url: s.logo_url,
      contact_email: s.contact_email, contact_whatsapp: s.contact_whatsapp,
      premium_message: s.premium_message,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Site settings saved");
  }

  async function addContact() {
    if (!newC.label) return toast.error("Label required");
    const { error } = await supabase.from("premium_contacts").insert(newC);
    if (error) return toast.error(error.message);
    setNewC({ label: "", whatsapp: "", email: "", phone: "", notes: "" });
    reload();
  }

  async function delContact(id: string) {
    await supabase.from("premium_contacts").delete().eq("id", id); reload();
  }

  async function makeMeAdmin() {
    if (!user) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("You're now admin. Reloading…");
    setTimeout(() => location.reload(), 800);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5">
          <Field label="Site name"><Input value={s.site_name ?? ""} onChange={e => setS({ ...s, site_name: e.target.value })} /></Field>
          <Field label="Tagline"><Input value={s.tagline ?? ""} onChange={e => setS({ ...s, tagline: e.target.value })} /></Field>
          <Field label="Logo URL"><Input value={s.logo_url ?? ""} onChange={e => setS({ ...s, logo_url: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Contact email"><Input value={s.contact_email ?? ""} onChange={e => setS({ ...s, contact_email: e.target.value })} /></Field>
          <Field label="Contact WhatsApp (international format)"><Input value={s.contact_whatsapp ?? ""} onChange={e => setS({ ...s, contact_whatsapp: e.target.value })} /></Field>
          <Field label="Premium connect message"><Textarea value={s.premium_message ?? ""} onChange={e => setS({ ...s, premium_message: e.target.value })} /></Field>
          <Button onClick={saveSettings} className="gradient-primary text-primary-foreground">Save</Button>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Add premium contact</h3>
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
          <p className="mb-2 text-sm text-muted-foreground">{profiles.length} profiles</p>
          <div className="max-h-96 space-y-1 overflow-auto">
            {profiles.map(p => (
              <div key={p.id} className="flex justify-between border-b border-border py-1.5 text-sm">
                <span>{p.display_name} {p.is_simulated && <span className="text-xs text-muted-foreground">(seed)</span>}</span>
                <span className="text-muted-foreground">{p.country}</span>
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
