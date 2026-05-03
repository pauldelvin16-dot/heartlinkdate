import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";

const ForgotPassword = () => {
  const s = useSiteSettings();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // The edge function uses the request Origin to build the reset URL,
    // so the link always points back to whatever domain the user is on.
    const { error } = await supabase.functions.invoke("request-password-reset", { body: { email } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("If that email exists, we've sent a reset link.");
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
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">We'll email you a secure link to reset it.</p>
          {sent ? (
            <p className="rounded-xl bg-muted p-4 text-sm">Check your inbox. The link expires in 1 hour.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}
          <Link to="/auth" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
