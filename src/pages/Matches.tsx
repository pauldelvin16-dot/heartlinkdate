import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("matches").select("*").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("created_at", { ascending: false });
      const otherIds = (data ?? []).map((m: any) => m.user_a === user.id ? m.user_b : m.user_a);
      if (!otherIds.length) return setMatches([]);
      const { data: profs } = await supabase.from("profiles").select("*").in("id", otherIds);
      setMatches((data ?? []).map((m: any) => {
        const otherId = m.user_a === user.id ? m.user_b : m.user_a;
        return { ...m, profile: profs?.find((p: any) => p.id === otherId) };
      }).filter((m: any) => m.profile));
    })();
  }, [user]);

  return (
    <div className="container max-w-3xl py-6 pb-24 md:pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Your matches</h1>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      {matches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">No matches yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Keep swiping — your spark is out there.</p>
          <Link to="/discover"><Button className="mt-4 gradient-primary text-primary-foreground">Start swiping</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {matches.map(m => (
            <Link key={m.id} to="/connect" className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-card">
              {m.profile.photos?.[0]
                ? <img src={m.profile.photos[0]} alt={m.profile.display_name} className="h-full w-full object-cover transition group-hover:scale-105" />
                : <div className="h-full w-full bg-muted" />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                <p className="font-semibold">{m.profile.display_name}</p>
                <p className="text-xs opacity-80">Tap to connect</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
