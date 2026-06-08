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
import {
  COUNTRIES, ETHNICITIES, GENDERS, ORIENTATIONS, INTERESTED_IN, AGE_GROUPS,
  CONDITIONS, INTERESTS, RELIGIONS, RELATIONSHIP_GOALS, SMOKING_OPTS, DRINKING_OPTS,
  CHILDREN_OPTS, EDUCATION_OPTS, FINANCIAL_OPTS, LANGUAGES,
} from "@/lib/constants";
import { KENYA_COUNTY_NAMES, subCountiesOf, townsOf, CAREERS } from "@/lib/kenya";
import { Camera, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [p, setP] = useState<any>({
    display_name: "", bio: "", age: "25", gender: "", orientation: "", interested_in: "",
    country: "", city: "", ethnicity: "", age_group: "adult",
    county: "", sub_county: "", town: "", career: "", career_custom: "",
    religion: "", relationship_goals: "", smoking: "", drinking: "", has_children: "",
    education: "", financial_status: "", height_cm: "",
    languages: [], conditions: [], interests: [], photos: [],
    preferred_age_min: 18, preferred_age_max: 99,
    preferred_genders: [], preferred_ethnicities: [], preferred_religions: [],
    preferred_countries: [], preferred_relationship_goals: [],
  });

  useEffect(() => {
    if (!loading && !user) nav("/auth");
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) setP((prev: any) => ({
          ...prev, ...data,
          age: data.age ? String(data.age) : prev.age,
          height_cm: data.height_cm ? String(data.height_cm) : "",
          languages: data.languages || [], conditions: data.conditions || [],
          interests: data.interests || [], photos: data.photos || [],
          preferred_genders: data.preferred_genders || [],
          preferred_ethnicities: data.preferred_ethnicities || [],
          preferred_religions: data.preferred_religions || [],
          preferred_countries: data.preferred_countries || [],
          preferred_relationship_goals: data.preferred_relationship_goals || [],
          preferred_age_min: data.preferred_age_min ?? 18,
          preferred_age_max: data.preferred_age_max ?? 99,
        }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  function toggle(field: string, v: string) {
    setP((cur: any) => ({ ...cur, [field]: cur[field].includes(v) ? cur[field].filter((x: string) => x !== v) : [...cur[field], v] }));
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
    const ageNum = parseInt(p.age, 10);
    if (!p.display_name || !p.gender || !p.orientation || !p.country || p.photos.length === 0) {
      toast.error("Please add a name, photo, gender, orientation and country."); return;
    }
    if (!ageNum || ageNum < 18 || ageNum > 120) {
      toast.error("Age must be between 18 and 120."); return;
    }
    setBusy(true);
    const careerFinal = (p.career === "Other" || p.career === "Matatu Operator")
      ? [p.career, p.career_custom].filter(Boolean).join(" — ")
      : (p.career || null);
    const { error } = await supabase.from("profiles").update({
      display_name: p.display_name, bio: p.bio, age: ageNum,
      gender: p.gender, orientation: p.orientation, interested_in: p.interested_in,
      country: p.country, city: p.city, region: p.region || null, ethnicity: p.ethnicity, age_group: p.age_group,
      county: p.county || null, sub_county: p.sub_county || null, town: p.town || null, career: careerFinal,
      religion: p.religion || null, relationship_goals: p.relationship_goals || null,
      smoking: p.smoking || null, drinking: p.drinking || null, has_children: p.has_children || null,
      education: p.education || null, financial_status: p.financial_status || null,
      height_cm: p.height_cm ? parseInt(p.height_cm, 10) : null,
      languages: p.languages, conditions: p.conditions, interests: p.interests, photos: p.photos,
      preferred_age_min: p.preferred_age_min, preferred_age_max: p.preferred_age_max,
      preferred_genders: p.preferred_genders, preferred_ethnicities: p.preferred_ethnicities,
      preferred_religions: p.preferred_religions, preferred_countries: p.preferred_countries,
      preferred_relationship_goals: p.preferred_relationship_goals,
    } as any).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved!");
    nav("/discover");
  }

  return (
    <div className="min-h-screen gradient-soft px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6 pb-24">
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
            <Field label="Age (18+)"><Input type="number" inputMode="numeric" min={18} max={120} value={p.age} onChange={e => setP({ ...p, age: e.target.value })} /></Field>
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
            <Field label="Region / State"><Input value={p.region ?? ""} placeholder="e.g. London, California, Nairobi County" onChange={e => setP({ ...p, region: e.target.value })} /></Field>
            <Field label="Ethnicity"><Picker value={p.ethnicity} onChange={v => setP({ ...p, ethnicity: v })} options={ETHNICITIES} /></Field>
            <Field label="Religion"><Picker value={p.religion} onChange={v => setP({ ...p, religion: v })} options={RELIGIONS} /></Field>
            <Field label="Height (cm)"><Input type="number" value={p.height_cm} onChange={e => setP({ ...p, height_cm: e.target.value })} /></Field>
          </div>
        </Section>

        {p.country === "Kenya" && (
          <Section title="🇰🇪 Where in Kenya?">
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">Helps us match you with people near you and deliver shop orders.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="County">
                <Select value={p.county || ""} onValueChange={v => setP({ ...p, county: v, sub_county: "", town: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                  <SelectContent className="max-h-72">{KENYA_COUNTY_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {p.county && (
                <Field label="Sub-county">
                  <Select value={p.sub_county || ""} onValueChange={v => setP({ ...p, sub_county: v, town: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                    <SelectContent className="max-h-72">{subCountiesOf(p.county).map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              )}
              {p.sub_county && (
                <Field label="Town / Estate">
                  {townsOf(p.county, p.sub_county).length > 0 ? (
                    <Select value={p.town || ""} onValueChange={v => setP({ ...p, town: v })}>
                      <SelectTrigger><SelectValue placeholder="Select town" /></SelectTrigger>
                      <SelectContent className="max-h-72">{townsOf(p.county, p.sub_county).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={p.town || ""} placeholder="Type your town" onChange={e => setP({ ...p, town: e.target.value })} />
                  )}
                </Field>
              )}
            </div>
          </Section>
        )}

        <Section title="Career">
          <p className="-mt-2 mb-3 text-xs text-muted-foreground">Pick what fits — or write your matatu sacco / employer if “Other”.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Career / Employer">
              <Picker value={p.career} onChange={v => setP({ ...p, career: v })} options={CAREERS} />
            </Field>
            {p.career === "Other" && (
              <Field label="Tell us more">
                <Input value={p.career_custom || ""} placeholder="e.g. Embassava sacco, Tahmeed driver" onChange={e => setP({ ...p, career_custom: e.target.value })} />
              </Field>
            )}
            {p.career === "Matatu Operator" && (
              <Field label="Sacco / Route">
                <Input value={p.career_custom || ""} placeholder="e.g. Super Metro, Route 105" onChange={e => setP({ ...p, career_custom: e.target.value })} />
              </Field>
            )}
          </div>
        </Section>


        <Section title="Lifestyle">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Looking for"><Picker value={p.relationship_goals} onChange={v => setP({ ...p, relationship_goals: v })} options={RELATIONSHIP_GOALS} /></Field>
            <Field label="Smoking"><Picker value={p.smoking} onChange={v => setP({ ...p, smoking: v })} options={SMOKING_OPTS} /></Field>
            <Field label="Drinking"><Picker value={p.drinking} onChange={v => setP({ ...p, drinking: v })} options={DRINKING_OPTS} /></Field>
            <Field label="Children"><Picker value={p.has_children} onChange={v => setP({ ...p, has_children: v })} options={CHILDREN_OPTS} /></Field>
            <Field label="Education"><Picker value={p.education} onChange={v => setP({ ...p, education: v })} options={EDUCATION_OPTS} /></Field>
            <Field label="Financial status (premium filter)"><Picker value={p.financial_status} onChange={v => setP({ ...p, financial_status: v })} options={FINANCIAL_OPTS} /></Field>
          </div>
        </Section>

        <Section title="Languages">
          <ChipGroup options={LANGUAGES} selected={p.languages} onToggle={v => toggle("languages", v)} />
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

        <Section title="What you're looking for">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Min age"><Input type="number" min={18} max={120} value={p.preferred_age_min} onChange={e => setP({ ...p, preferred_age_min: parseInt(e.target.value) || 18 })} /></Field>
            <Field label="Max age"><Input type="number" min={18} max={120} value={p.preferred_age_max} onChange={e => setP({ ...p, preferred_age_max: parseInt(e.target.value) || 99 })} /></Field>
          </div>
          <div className="mt-3 space-y-3">
            <div><Label className="mb-1 block">Preferred genders</Label><ChipGroup options={GENDERS} selected={p.preferred_genders} onToggle={v => toggle("preferred_genders", v)} /></div>
            <div><Label className="mb-1 block">Preferred religions</Label><ChipGroup options={RELIGIONS} selected={p.preferred_religions} onToggle={v => toggle("preferred_religions", v)} /></div>
            <div><Label className="mb-1 block">Preferred ethnicities</Label><ChipGroup options={ETHNICITIES} selected={p.preferred_ethnicities} onToggle={v => toggle("preferred_ethnicities", v)} /></div>
            <div><Label className="mb-1 block">Preferred countries</Label><ChipGroup options={COUNTRIES.map(c => c.name)} selected={p.preferred_countries} onToggle={v => toggle("preferred_countries", v)} /></div>
            <div><Label className="mb-1 block">Relationship goals</Label><ChipGroup options={RELATIONSHIP_GOALS} selected={p.preferred_relationship_goals} onToggle={v => toggle("preferred_relationship_goals", v)} /></div>
          </div>
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
