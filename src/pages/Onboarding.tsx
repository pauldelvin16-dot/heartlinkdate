import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { COUNTRIES, ETHNICITIES, GENDERS, ORIENTATIONS, INTERESTED_IN, AGE_GROUPS, CONDITIONS, INTERESTS } from "@/lib/constants";
import { Camera, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [p, setP] = useState<any>({
    display_name: "", bio: "", age: 25, gender: "", orientation: "", interested_in: "",
    country: "", city: "", ethnicity: "", age_group: "adult",
    conditions: [], interests: [], photos: [],
  });

  useEffect(() => {
    if (!loading && !user) nav("/auth");
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) setP({ ...p, ...data, conditions: data.conditions || [], interests: data.interests || [], photos: data.photos || [] });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  function toggle(field: "conditions" | "interests", v: string) {
    setP({ ...p, [field]: p[field].includes(v) ? p[field].filter((x: string) => x !== v) : [...p[field], v] });
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !user) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(e.target.files).slice(0, 6 - p.photos.length)) {
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    setP({ ...p, photos: [...p.photos, ...newUrls] });
    setUploading(false);
  }

  async function save() {
    if (!user) return;
    if (!p.display_name || !p.gender || !p.orientation || !p.country || p.photos.length === 0) {
      toast.error("Please add a name, photo, gender, orientation and country."); return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: p.display_name, bio: p.bio, age: Number(p.age),
      gender: p.gender, orientation: p.orientation, interested_in: p.interested_in,
      country: p.country, city: p.city, ethnicity: p.ethnicity, age_group: p.age_group,
      conditions: p.conditions, interests: p.interests, photos: p.photos,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved!");
    nav("/discover");
  }

  return (
    <div className="min-h-screen gradient-soft px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Set up your profile</h1>
          <p className="text-muted-foreground">A great profile = better matches.</p>
        </div>

        <Section title="Photos (1–6)">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {p.photos.map((url: string, i: number) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setP({ ...p, photos: p.photos.filter((_: any, j: number) => j !== i) })}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {p.photos.length < 6 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                <span className="text-xs">Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={upload} />
              </label>
            )}
          </div>
        </Section>

        <Section title="Basics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Display name"><Input value={p.display_name} onChange={e => setP({ ...p, display_name: e.target.value })} /></Field>
            <Field label="Age"><Input type="number" min={18} max={120} value={p.age} onChange={e => setP({ ...p, age: e.target.value })} /></Field>
            <Field label="Gender"><Picker value={p.gender} onChange={v => setP({ ...p, gender: v })} options={GENDERS} /></Field>
            <Field label="Orientation"><Picker value={p.orientation} onChange={v => setP({ ...p, orientation: v })} options={ORIENTATIONS} /></Field>
            <Field label="Interested in"><Picker value={p.interested_in} onChange={v => setP({ ...p, interested_in: v })} options={INTERESTED_IN} /></Field>
            <Field label="Age group"><Picker value={p.age_group} onChange={v => setP({ ...p, age_group: v })} options={AGE_GROUPS.map(a => ({ v: a.v, l: a.l }))} /></Field>
            <Field label="Country">
              <Select value={p.country} onValueChange={v => setP({ ...p, country: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="City"><Input value={p.city} onChange={e => setP({ ...p, city: e.target.value })} /></Field>
            <Field label="Ethnicity"><Picker value={p.ethnicity} onChange={v => setP({ ...p, ethnicity: v })} options={ETHNICITIES} /></Field>
          </div>
        </Section>

        <Section title="About you">
          <Textarea rows={4} placeholder="Tell people about yourself…" value={p.bio} onChange={e => setP({ ...p, bio: e.target.value })} />
        </Section>

        <Section title="Interests">
          <ChipGroup options={INTERESTS} selected={p.interests} onToggle={v => toggle("interests", v)} />
        </Section>

        <Section title="Living with (optional)">
          <p className="-mt-2 mb-3 text-xs text-muted-foreground">Help find people who relate. Always optional.</p>
          <ChipGroup options={CONDITIONS} selected={p.conditions} onToggle={v => toggle("conditions", v)} />
        </Section>

        <Button onClick={save} disabled={busy} size="lg" className="w-full gradient-primary text-primary-foreground shadow-glow">
          {busy ? "Saving…" : "Save & start matching"}
        </Button>
      </div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block">{label}</Label>{children}</div>;
}
function Picker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: any[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o: any) => typeof o === "string"
          ? <SelectItem key={o} value={o}>{o}</SelectItem>
          : <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <Badge key={o} onClick={() => onToggle(o)}
          variant={selected.includes(o) ? "default" : "outline"}
          className="cursor-pointer rounded-full px-3 py-1 capitalize">{o.replace(/-/g, " ")}</Badge>
      ))}
    </div>
  );
}

export default Onboarding;
