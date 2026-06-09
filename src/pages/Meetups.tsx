import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, HandCoins, CheckCircle2, XCircle, Clock, PartyPopper, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Escrow = {
  id: string; match_id: string; payer_id: string; payee_id: string;
  amount_kes: number; purpose: string | null; status: string;
  funded_at: string | null; released_at: string | null; fulfilled_at: string | null;
  created_at: string;
  payer?: { display_name: string; photos: string[] | null };
  payee?: { display_name: string; photos: string[] | null };
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  funded: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  released: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  fulfilled: "bg-primary/15 text-primary border-primary/30",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Meetups() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Escrow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const { data } = await (supabase as any).from("meetup_escrows")
      .select("*").or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).flatMap((r: any) => [r.payer_id, r.payee_id])));
    const { data: profs } = await supabase.from("profiles").select("id,display_name,photos").in("id", ids as any);
    const map: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p; });
    setRows((data ?? []).map((r: any) => ({ ...r, payer: map[r.payer_id], payee: map[r.payee_id] })));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function release(id: string) {
    setBusy(id);
    const { error } = await (supabase as any).rpc("release_meetup_escrow", { _escrow_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Funds released. Waiting for payee to mark fulfilled.");
    load();
  }
  async function fulfill(id: string) {
    setBusy(id);
    const { error } = await (supabase as any).rpc("mark_meetup_fulfilled", { _escrow_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Meetup marked as fulfilled 🎉"); load();
  }
  async function cancel(id: string) {
    if (!confirm("Cancel this Meetup Pay? If already funded, it will be flagged for refund.")) return;
    setBusy(id);
    const { error } = await (supabase as any).rpc("cancel_meetup_escrow", { _escrow_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Cancelled"); load();
  }

  return (
    <div className="container max-w-3xl px-4 py-6 pb-24">
      <div className="mb-5 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Meetup Pay</h1>
          <p className="text-xs text-muted-foreground">Safe escrow payments between you and your match. Funds are held until you confirm the meetup went well.</p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <HandCoins className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">No Meetup Pay yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Open a match and tap <strong>Meetup Pay</strong> to send funds safely.</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map(r => {
          const iAmPayer = r.payer_id === user?.id;
          const other = iAmPayer ? r.payee : r.payer;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {other?.photos?.[0] ? <img src={other.photos[0]} className="h-full w-full object-cover" alt="" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {iAmPayer ? "→ Sent to " : "← From "} {other?.display_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.purpose || "Meetup"}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">KES {r.amount_kes.toLocaleString()}</p>
                  <Badge variant="outline" className={STATUS_STYLES[r.status] || ""}>{r.status}</Badge>
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Step on label="Created" />
                <Step on={!!r.funded_at} label="Funded" />
                <Step on={!!r.released_at} label="Released" />
                <Step on={!!r.fulfilled_at} label="Fulfilled" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {iAmPayer && r.status === "funded" && (
                  <Button size="sm" disabled={busy === r.id} onClick={() => release(r.id)} className="gradient-primary text-primary-foreground">
                    {busy === r.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                    I'm satisfied — Release
                  </Button>
                )}
                {!iAmPayer && r.status === "released" && (
                  <Button size="sm" disabled={busy === r.id} onClick={() => fulfill(r.id)} className="gradient-primary text-primary-foreground">
                    <PartyPopper className="mr-1 h-3 w-3" /> Mark fulfilled
                  </Button>
                )}
                {iAmPayer && ["pending", "funded"].includes(r.status) && (
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => cancel(r.id)}>
                    <XCircle className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                )}
                {r.status === "pending" && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Waiting for M-Pesa confirmation…
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step({ on, label }: { on?: boolean; label: string }) {
  return (
    <div className="flex flex-1 items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${on ? "bg-primary" : "bg-muted-foreground/30"}`} />
      <span className={on ? "text-foreground" : ""}>{label}</span>
      <span className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}
