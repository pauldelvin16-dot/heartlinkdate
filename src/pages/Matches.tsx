import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Sparkles, MessageCircle, Lock, Crown, Clock, CheckCircle2, XCircle, Shield, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ReqStatus = "pending" | "approved" | "declined" | undefined;

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [premium, setPremium] = useState(false);
  const [allowed, setAllowed] = useState<Record<string, boolean>>({});
  const [requests, setRequests] = useState<Record<string, ReqStatus>>({});
  const [payOpen, setPayOpen] = useState<{ matchId: string; otherId: string; name: string } | null>(null);
  const [payForm, setPayForm] = useState({ amount: "500", purpose: "", phone: "" });
  const [paying, setPaying] = useState(false);

  async function startMeetupPay() {
    if (!payOpen || !user) return;
    const amt = parseInt(payForm.amount, 10);
    if (!amt || amt < 1) return toast.error("Enter a valid amount");
    if (!payForm.phone) return toast.error("Enter your M-Pesa phone");
    setPaying(true);
    const { data: escrowId, error: rpcErr } = await (supabase as any).rpc("create_meetup_escrow", {
      _match_id: payOpen.matchId, _amount_kes: amt, _purpose: payForm.purpose || null,
    });
    if (rpcErr) { setPaying(false); return toast.error(rpcErr.message); }
    const { data: stk, error: stkErr } = await supabase.functions.invoke("initiate-mpesa", {
      body: { phone: payForm.phone, escrow_id: escrowId },
    });
    setPaying(false);
    if (stkErr || (stk as any)?.error) return toast.error((stk as any)?.error || stkErr?.message || "Failed to start M-Pesa");
    toast.success("STK push sent. Enter your M-Pesa PIN to fund escrow.");
    setPayOpen(null);
  }

  async function load() {
    if (!user) return;
    const { data: me } = await supabase.from("profiles").select("is_premium").eq("id", user.id).maybeSingle();
    setPremium(!!me?.is_premium);
    const { data } = await supabase.from("matches").select("*").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("created_at", { ascending: false });
    const otherIds = (data ?? []).map((m: any) => m.user_a === user.id ? m.user_b : m.user_a);
    if (!otherIds.length) return setMatches([]);
    const { data: profs } = await supabase.from("profiles").select("*").in("id", otherIds);
    const list = (data ?? []).map((m: any) => {
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      return { ...m, otherId, profile: profs?.find((p: any) => p.id === otherId) };
    }).filter((m: any) => m.profile);
    setMatches(list);

    const { data: reqs } = await supabase.from("connection_requests").select("match_id,status").eq("user_id", user.id);
    const rmap: Record<string, ReqStatus> = {};
    (reqs ?? []).forEach((r: any) => { rmap[r.match_id] = r.status; });
    setRequests(rmap);

    const map: Record<string, boolean> = {};
    await Promise.all(list.map(async (m: any) => {
      const { data: can } = await (supabase as any).rpc("can_message", { _a: user.id, _b: m.otherId });
      map[m.id] = !!can;
    }));
    setAllowed(map);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function requestConnect(matchId: string, otherId: string) {
    if (!user) return;
    const { error } = await supabase.from("connection_requests").insert({ user_id: user.id, match_id: matchId, target_id: otherId });
    if (error) return toast.error(error.message);
    toast.success("Request sent — our team will review shortly");
    setRequests((r) => ({ ...r, [matchId]: "pending" }));
  }

  return (
    <div className="container max-w-3xl py-6 pb-24 md:pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Your matches</h1>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      {!premium && matches.length > 0 && (
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-primary" />
            Messaging is locked. Upgrade to chat instantly with all your matches.
          </div>
          <Link to="/connect"><Button size="sm" className="gradient-primary text-primary-foreground"><Crown className="mr-1 h-4 w-4" /> Upgrade</Button></Link>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">No matches yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Keep swiping — your spark is out there.</p>
          <Link to="/discover"><Button className="mt-4 gradient-primary text-primary-foreground">Start swiping</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const can = allowed[m.id];
            const reqStatus = requests[m.id];
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {m.profile.photos?.[0]
                    ? <img src={m.profile.photos[0]} className="h-full w-full object-cover" alt={m.profile.display_name} />
                    : <div className="grid h-full w-full place-items-center text-muted-foreground"><Heart className="h-6 w-6" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.profile.display_name}{m.profile.age ? `, ${m.profile.age}` : ""}</p>
                  <p className="truncate text-xs text-muted-foreground">{[m.profile.city, m.profile.region, m.profile.country].filter(Boolean).join(" · ")}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    Matched {new Date(m.created_at).toLocaleDateString()}
                    {reqStatus === "pending" && <Badge variant="secondary" className="gap-1"><Clock className="h-2.5 w-2.5" /> Pending review</Badge>}
                    {reqStatus === "approved" && <Badge className="gap-1 bg-emerald-500/90 text-white"><CheckCircle2 className="h-2.5 w-2.5" /> Approved</Badge>}
                    {reqStatus === "declined" && <Badge variant="outline" className="gap-1 text-destructive"><XCircle className="h-2.5 w-2.5" /> Declined</Badge>}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {can ? (
                    <Link to={`/chat/${m.id}`}>
                      <Button size="sm" className="gradient-primary text-primary-foreground"><MessageCircle className="mr-1 h-4 w-4" /> Open Messages</Button>
                    </Link>
                  ) : reqStatus === "pending" ? (
                    <Button size="sm" variant="outline" disabled><Clock className="mr-1 h-4 w-4" /> Awaiting approval</Button>
                  ) : reqStatus === "declined" ? (
                    <Link to="/connect"><Button size="sm" className="gradient-primary text-primary-foreground"><Crown className="mr-1 h-4 w-4" /> Upgrade to chat</Button></Link>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => requestConnect(m.id, m.otherId)}>Request connect</Button>
                      <Link to="/connect"><Button size="sm" variant="ghost" className="text-primary"><Crown className="mr-1 h-4 w-4" /> Upgrade</Button></Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Matches;
