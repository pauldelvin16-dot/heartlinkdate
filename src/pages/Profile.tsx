import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Pencil, LogOut, Heart, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ProfilePage = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [p, setP] = useState<any>(null);

  useEffect(() => {
    if (user) supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setP(data));
  }, [user]);

  if (!p) return <div className="container py-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="container max-w-2xl py-6 pb-24 md:pb-10">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        {p.photos?.[0] && <img src={p.photos[0]} alt={p.display_name} className="aspect-[3/2] w-full object-cover" />}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">{p.display_name}{p.age ? `, ${p.age}` : ""}</h1>
              <p className="text-sm text-muted-foreground">{[p.city, p.country].filter(Boolean).join(", ")}</p>
            </div>
            {isAdmin && <Badge className="gradient-primary text-primary-foreground border-0"><Shield className="mr-1 h-3 w-3" /> Admin</Badge>}
          </div>
          {p.bio && <p className="mt-3 text-sm">{p.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.gender && <Badge variant="outline">{p.gender}</Badge>}
            {p.orientation && <Badge variant="outline">{p.orientation}</Badge>}
            {p.ethnicity && <Badge variant="outline">{p.ethnicity}</Badge>}
            {(p.interests ?? []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
            {(p.conditions ?? []).map((t: string) => <Badge key={t} className="bg-primary/80 text-white border-0">{t.replace(/-/g, " ")}</Badge>)}
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Link to="/onboarding"><Button variant="outline" className="w-full"><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button></Link>
            <Link to="/connect"><Button variant="outline" className="w-full"><Heart className="mr-1.5 h-4 w-4" /> Connect</Button></Link>
            <Button variant="outline" onClick={signOut} className="w-full"><LogOut className="mr-1.5 h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
