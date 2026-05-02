import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Heart } from "lucide-react";

const SUPPORTED_DIALS = ["+44","+353","+33","+49","+34","+39","+31","+46","+47","+45","+358","+32","+43","+351","+48","+1","+61"];

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(50),
  dial: z.string().refine(v => SUPPORTED_DIALS.includes(v), "Country not supported"),
  phone: z.string().trim().regex(/^\d{6,14}$/, "Phone digits only (no spaces)"),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const Auth = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const s = useSiteSettings();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", dial: "+44", phone: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav("/discover"); });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const phoneFull = `${form.dial}${form.phone}`;
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { display_name: form.displayName, phone: phoneFull },
          },
        });
        if (error) throw error;
        // store phone on profile after signup
        const { data: u } = await supabase.auth.getUser();
        if (u.user) await supabase.from("profiles").update({ phone: phoneFull }).eq("id", u.user.id);
        toast.success("Account created! Let's set up your profile.");
        nav("/onboarding");
      } else {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        nav("/discover");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen gradient-soft px-4 py-12">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
            <Heart className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl font-bold">{s?.site_name ?? "HeartLink"}</span>
        </Link>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="mb-1 text-2xl font-bold">{mode === "signup" ? "Create account" : "Welcome back"}</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {mode === "signup" ? "Available in UK, Europe, USA & Australia." : "Sign in to keep finding your spark."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="dn">Display name</Label>
                <Input id="dn" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required />
              </div>
            )}
            <div>
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={mode === "signup" ? 8 : 1} />
            </div>
            {mode === "signup" && (
              <div>
                <Label>Phone (UK, EU, USA, AU only)</Label>
                <div className="mt-1 flex gap-2">
                  <Select value={form.dial} onValueChange={v => setForm({ ...form, dial: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c.code} value={c.dial}>{c.dial} {c.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="7700900123" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} required />
                </div>
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow">
              {busy ? "…" : (mode === "signup" ? "Create account" : "Sign in")}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
