import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Heart, MessageCircle, Mail, Phone, Crown, Loader2, Smartphone, CheckCircle2, Sparkles, Star, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const Connect = () => {
  const settings = useSiteSettings();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [mpesa, setMpesa] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<any>(null);

  useEffect(() => {
    supabase.from("premium_contacts").select("*").eq("is_active", true).then(({ data }) => setContacts(data ?? []));
    (supabase as any).rpc("get_mpesa_public_settings").then(({ data }: any) => {
      const row = Array.isArray(data) ? data[0] : data;
      setMpesa(row ?? null);
    });
    supabase.from("mpesa_packages").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setPackages(data ?? []);
      const popular = (data ?? []).find((p: any) => p.is_popular) || (data ?? [])[0];
      if (popular) setSelected(popular);
    });
    if (user) {
      supabase.from("matches").select("id", { count: "exact", head: true }).or(`user_a.eq.${user.id},user_b.eq.${user.id}`).then(({ count }) => setMatchCount(count ?? 0));
      supabase.from("profiles").select("is_premium,phone").eq("id", user.id).maybeSingle().then(({ data }: any) => { setMe(data); if (data?.phone) setPhone(data.phone); });
      supabase.from("premium_subscriptions").select("*").eq("user_id", user.id).eq("status", "active").order("expires_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setSub(data));
      (supabase as any).from("mpesa_payments").select("*").eq("user_id", user.id).in("status", ["pending", "processing"]).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }: any) => {
        if (data) { setPayment(data); startPolling(data.id); }
      });
    }
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [user]);

  const wa = (n?: string | null) => n ? `https://wa.me/${n.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Hi! I have a match on " + (settings?.site_name ?? "HeartLink") + " and would like to connect with them.")}` : "#";

  async function pay() {
    if (!phone) return toast.error("Enter the M-Pesa phone number");
    if (!selected) return toast.error("Select a package");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-mpesa", { body: { phone, package_id: selected.id } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      setPayment((data as any).payment);
      toast.success("Check your phone and enter your M-Pesa PIN");
      startPolling((data as any).payment.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  function startPolling(payment_id: string) {
    setPolling(true);
    let n = 0;
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      n++;
      const { data } = await supabase.functions.invoke("poll-mpesa-payment", { body: { payment_id } });
      const p = (data as any)?.payment;
      if (p) setPayment(p);
      if (p?.status === "paid") {
        clearInterval(pollTimer.current); setPolling(false);
        toast.success("Payment confirmed — Premium unlocked!");
        setTimeout(() => location.reload(), 1500);
      } else if (p?.status === "failed" || n > 24) {
        clearInterval(pollTimer.current); setPolling(false);
        if (p?.status === "failed") toast.error(p.result_desc || "Payment failed or cancelled");
        else if (n > 24) toast.error("Timed out waiting for payment confirmation");
      }
    }, 5000);
  }

  const expiresStr = sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString() : null;

  return (
    <div className="container max-w-3xl py-6 pb-24 md:pb-10">
      <div className="mb-6 rounded-3xl gradient-hero p-1 shadow-glow">
        <div className="rounded-3xl bg-card p-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground">
            <Heart className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold">Get connected</h1>
          <p className="mt-2 text-muted-foreground">
            {matchCount > 0 ? `You have ${matchCount} match${matchCount > 1 ? "es" : ""}! ` : "When you match, "}
            {settings?.premium_message ?? "Upgrade to premium for unlimited swipes and direct messaging."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/matches"><Button variant="outline"><Sparkles className="mr-1.5 h-4 w-4" /> Open Matches</Button></Link>
          </div>
        </div>
      </div>

      {/* Active premium banner */}
      {me?.is_premium && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 to-transparent p-4">
          <Crown className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">You're a Premium member</p>
            {expiresStr && <p className="text-xs text-muted-foreground">Active until {expiresStr}</p>}
          </div>
          <Link to="/matches"><Button size="sm"><MessageCircle className="mr-1 h-4 w-4" /> Chat now</Button></Link>
        </div>
      )}

      {/* Premium upgrade with packages */}
      {!me?.is_premium && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Choose your premium plan</h2>
          </div>

          {packages.length === 0 && (
            <p className="text-sm text-muted-foreground">No packages available yet.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {packages.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={cn(
                  "relative rounded-2xl border p-4 text-left transition-all",
                  selected?.id === p.id ? "border-primary shadow-glow ring-2 ring-primary/30" : "border-border hover:border-primary/40 hover:shadow-soft"
                )}
              >
                {p.is_popular && (
                  <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground"><Star className="h-3 w-3" /> Popular</span>
                )}
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 text-2xl font-bold">KES {p.amount}</p>
                <p className="text-xs text-muted-foreground">{p.duration_days} days</p>
                {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
                <ul className="mt-3 space-y-1 text-xs">
                  {(p.features || []).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {f}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* Pay area */}
          {selected && (
            mpesa?.is_active ? (
              <div className="mt-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5">
                <p className="mb-2 text-sm">Pay <strong>KES {selected.amount}</strong> for <strong>{selected.name}</strong> ({selected.duration_days} days)</p>
                {payment?.status === "paid" ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Premium unlocked!</div>
                ) : (
                  <>
                    <Label className="mb-1 block">M-Pesa phone number</Label>
                    <div className="flex gap-2">
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
                      <Button onClick={pay} disabled={busy || polling} className="gradient-primary text-primary-foreground whitespace-nowrap">
                        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Smartphone className="mr-1.5 h-4 w-4" />}
                        Pay now
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
                M-Pesa is currently disabled. Contact us below to upgrade manually.
              </div>
            )
          )}
        </div>
      )}

      {/* Premium concierge */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Premium concierge</h2>
        {matchCount > 0
          ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">{matchCount} match{matchCount > 1 ? "es" : ""} ready</span>
          : <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">No matches yet — keep swiping</span>}
      </div>
      <div className="space-y-3">
        {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts configured yet.</p>}
        {contacts.map(c => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="font-semibold">{c.label}</p>
            {c.notes && <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.whatsapp && (
                <a href={wa(c.whatsapp)} target="_blank" rel="noreferrer">
                  <Button className="gradient-primary text-primary-foreground"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp: Connect me</Button>
                </a>
              )}
              {c.email && <a href={`mailto:${c.email}`}><Button variant="outline"><Mail className="mr-1.5 h-4 w-4" /> Email</Button></a>}
              {c.phone && <a href={`tel:${c.phone}`}><Button variant="outline"><Phone className="mr-1.5 h-4 w-4" /> Call</Button></a>}
            </div>
          </div>
        ))}
      </div>

      {/* Spinner overlay */}
      <AnimatePresence>
        {(polling || payment?.status === "pending" || payment?.status === "processing") && payment?.status !== "paid" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-md p-6"
          >
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-7 text-center shadow-glow">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Smartphone className="absolute inset-0 m-auto h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-bold">Confirm on your phone</h3>
              <p className="mt-1 text-sm text-muted-foreground">Enter your M-Pesa PIN on the prompt sent to <strong>{payment?.phone || phone}</strong>.</p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Waiting for confirmation…
              </div>
              <Button variant="ghost" className="mt-4" onClick={() => { if (pollTimer.current) clearInterval(pollTimer.current); setPolling(false); }}>
                Hide
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Connect;
