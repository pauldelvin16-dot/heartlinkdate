import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const s = useSiteSettings();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { toast.error("Missing reset token"); nav("/forgot-password"); }
  }, [token, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be 8+ characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("reset-password", { body: { token, password: pw } });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success("Password updated. Please sign in.");
    nav("/auth");
  }

  return (
    <div className="min-h-screen gradient-soft px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
            <Heart className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl font-bold">{s?.site_name ?? "HeartLink"}</span>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8 space-y-4">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <div><Label>New password</Label><Input type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={8} /></div>
          <div><Label>Confirm password</Label><Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={8} /></div>
          <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
