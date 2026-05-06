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
import { Heart, Mail } from "lucide-react";

function makeSignupSchema(allowed: string[]) {
  return z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    displayName: z.string().trim().min(2).max(50),
    dial: z.string().refine(v => allowed.includes(v), "Country not supported"),
    phone: z.string().trim().regex(/^\d{6,14}$/, "Phone digits only (no spaces)"),
  });
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const Auth = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const s = useSiteSettings();
  const [mode, setMode] = useState<"login" | "signup" | "otp">(params.get("mode") === "signup" ? "signup" : "login");
  const [busy, setBusy] = useState(false);
  const [otpStage, setOtpStage] = useState<"send" | "verify">("send");
  const [otpCode, setOtpCode] = useState("");
  const [form, setForm] = useState({ email: "", password: "", displayName: "", dial: "+44", phone: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav("/discover"); });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const allowed = (s?.allowed_country_codes && s.allowed_country_codes.length) ? s.allowed_country_codes : COUNTRIES.map(c => c.dial);
        const parsed = makeSignupSchema(allowed).safeParse(form);
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
        const { data: u } = await supabase.auth.getUser();
        if (u.user) await supabase.from("profiles").update({ phone: phoneFull }).eq("id", u.user.id);
        // Send branded welcome email via SMTP if configured (best-effort)
        supabase.functions.invoke("welcome-email", { body: { to: form.email, name: form.displayName } }).catch(() => {});
        toast.success("Account created! Let's set up your profile.");
        nav("/onboarding");
      } else if (mode === "login") {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        nav("/discover");
      } else if (mode === "otp") {
        if (otpStage === "send") {
          if (!form.email) return toast.error("Enter your email");
          const { error } = await supabase.functions.invoke("send-otp", { body: { email: form.email, purpose: "login" } });
          if (error) throw error;
          setOtpStage("verify");
          toast.success("Code sent. Check your inbox.");
        } else {
          const { data, error } = await supabase.functions.invoke("verify-otp", { body: { email: form.email, code: otpCode } });
          if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
          const tokenHash = (data as any)?.token_hash;
          const verType = (data as any)?.verification_type || "magiclink";
          if (!tokenHash) throw new Error("Could not create a secure sign-in session");
          const { error: e2 } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verType as any });
          if (e2) throw e2;
          toast.success("Signed in successfully");
          nav("/discover");
        }
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
          <h1 className="mb-1 text-2xl font-bold">
            {mode === "signup" ? "Create account" : mode === "otp" ? "Sign in with code" : "Welcome back"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {mode === "signup" ? "Available in UK, Europe, USA & Australia." : mode === "otp" ? "We'll email you a one-time code." : "Sign in to keep finding your spark."}
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
            {mode !== "otp" && (
              <div>
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={mode === "signup" ? 8 : 1} />
              </div>
            )}
            {mode === "otp" && otpStage === "verify" && (
              <div>
                <Label>6-digit code</Label>
                <Input inputMode="numeric" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))} required />
              </div>
            )}
            {mode === "signup" && (
              <div>
                <Label>Phone (UK, EU, USA, AU only)</Label>
                <div className="mt-1 flex gap-2">
                  <Select value={form.dial} onValueChange={v => setForm({ ...form, dial: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.filter(c => !s?.allowed_country_codes?.length || s.allowed_country_codes.includes(c.dial)).map(c => <SelectItem key={c.code} value={c.dial}>{c.dial} {c.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="7700900123" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} required />
                </div>
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow">
              {busy ? "…" : mode === "signup" ? "Create account" : mode === "otp" ? (otpStage === "send" ? "Send code" : "Verify code") : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === "login" && (
              <>
                <Link to="/forgot-password" className="block text-muted-foreground hover:text-foreground">Forgot password?</Link>
                <button onClick={() => { setMode("otp"); setOtpStage("send"); }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /> Sign in with email code</button>
              </>
            )}
            <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setOtpStage("send"); }} className="block w-full text-muted-foreground hover:text-foreground">
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
