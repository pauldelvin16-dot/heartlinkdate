import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Heart, MessageCircle, Mail, Phone, Crown, Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Connect = () => {
  const settings = useSiteSettings();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [mpesa, setMpesa] = useState<any>(null);
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
    if (user) {
      supabase.from("matches").select("id", { count: "exact", head: true }).or(`user_a.eq.${user.id},user_b.eq.${user.id}`).then(({ count }) => setMatchCount(count ?? 0));
      supabase.from("profiles").select("is_premium,phone").eq("id", user.id).maybeSingle().then(({ data }: any) => { setMe(data); if (data?.phone) setPhone(data.phone); });
      // Resume polling any in-progress payment after refresh
      (supabase as any).from("mpesa_payments").select("*").eq("user_id", user.id).in("status", ["pending", "processing"]).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }: any) => {
        if (data) { setPayment(data); startPolling(data.id); }
      });
    }
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [user]);

  const wa = (n?: string | null) => n ? `https://wa.me/${n.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Hi! I have a match on " + (settings?.site_name ?? "HeartLink") + " and would like to connect with them.")}` : "#";

  async function pay() {
    if (!phone) return toast.error("Enter the M-Pesa phone number");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-mpesa", { body: { phone } });
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
        setTimeout(() => location.reload(), 1200);
      } else if (p?.status === "failed" || n > 24) {
        clearInterval(pollTimer.current); setPolling(false);
        if (p?.status === "failed") toast.error(p.result_desc || "Payment failed or cancelled");
      }
    }, 5000);
  }

  return (
    <div className="container max-w-2xl py-6 pb-24 md:pb-10">
      <div className="mb-6 rounded-3xl gradient-hero p-1 shadow-glow">
        <div className="rounded-3xl bg-card p-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground">
            <Heart className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold">Get connected</h1>
          <p className="mt-2 text-muted-foreground">
            {matchCount > 0 ? `You have ${matchCount} match${matchCount > 1 ? "es" : ""}! ` : "When you match, "}
            {settings?.premium_message ?? "Upgrade to premium for unlimited swipes and direct connections."}
          </p>
        </div>
      </div>

      {/* Premium upgrade */}
      {!me?.is_premium && mpesa?.is_active && (
        <div className="mb-6 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">Upgrade to Premium</h2></div>
          <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
            <li>✨ Unlimited swipes every day</li>
            <li>🎯 Premium filters: country, financial status, distance radius</li>
            <li>💎 Priority placement in matching</li>
            <li>📍 See profiles near you with distance</li>
          </ul>
          {payment?.status === "paid" ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Premium unlocked!</div>
          ) : (
            <>
              <Label className="mb-1 block">M-Pesa phone number</Label>
              <div className="flex gap-2">
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
                <Button onClick={pay} disabled={busy || polling} className="gradient-primary text-primary-foreground whitespace-nowrap">
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Smartphone className="mr-1.5 h-4 w-4" />}
                  Pay KES {mpesa.amount}
                </Button>
              </div>
              {polling && <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Waiting for M-Pesa confirmation… enter your PIN on your phone.</p>}
              {payment?.status === "failed" && <p className="mt-2 text-xs text-destructive">{payment.result_desc || "Payment cancelled"}</p>}
            </>
          )}
        </div>
      )}

      {me?.is_premium && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <Crown className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">You're a Premium member — enjoy unlimited matches.</p>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Premium concierge</h2>
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
    </div>
  );
};

export default Connect;
