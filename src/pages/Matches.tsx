import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Sparkles, MessageCircle, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [premium, setPremium] = useState(false);
  const [allowed, setAllowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
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

      // Check messaging permission per match
      const map: Record<string, boolean> = {};
      await Promise.all(list.map(async (m: any) => {
        const { data: can } = await (supabase as any).rpc("can_message", { _a: user.id, _b: m.otherId });
        map[m.id] = !!can;
      }));
      setAllowed(map);
    })();
  }, [user]);

  async function requestConnect(matchId: string, otherId: string) {
    if (!user) return;
    const { error } = await supabase.from("connection_requests").insert({ user_id: user.id, match_id: matchId, target_id: otherId });
    if (error) toast.error(error.message); else toast.success("Request sent — our team will be in touch");
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
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {m.profile.photos?.[0]
                    ? <img src={m.profile.photos[0]} className="h-full w-full object-cover" alt={m.profile.display_name} />
                    : <div className="grid h-full w-full place-items-center text-muted-foreground"><Heart className="h-6 w-6" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.profile.display_name}{m.profile.age ? `, ${m.profile.age}` : ""}</p>
                  <p className="truncate text-xs text-muted-foreground">{[m.profile.city, m.profile.country].filter(Boolean).join(" · ")}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Matched {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {can ? (
                    <Link to={`/chat/${m.id}`}>
                      <Button size="sm" className="gradient-primary text-primary-foreground"><MessageCircle className="mr-1 h-4 w-4" /> Message</Button>
                    </Link>
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
