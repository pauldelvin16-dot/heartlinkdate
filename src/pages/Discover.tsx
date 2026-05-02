import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Heart, X, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  photos: string[];
  interests: string[] | null;
  conditions: string[] | null;
  orientation: string | null;
  gender: string | null;
}

const Discover = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setMe(myProfile);
      if (!myProfile?.gender || (myProfile.photos?.length ?? 0) === 0) {
        nav("/onboarding"); return;
      }
      const { data: swiped } = await supabase.from("swipes").select("target_id").eq("swiper_id", user.id);
      const swipedIds = new Set((swiped ?? []).map((s: any) => s.target_id));
      swipedIds.add(user.id);
      const { data: list } = await supabase.from("profiles").select("*").eq("is_active", true).limit(100);
      setProfiles((list ?? []).filter((p: any) => !swipedIds.has(p.id)));
      setLoading(false);
    })();
  }, [user, nav]);

  async function swipe(target: Profile, liked: boolean) {
    if (!user) return;
    setProfiles(p => p.filter(x => x.id !== target.id));
    const { error } = await supabase.from("swipes").insert({ swiper_id: user.id, target_id: target.id, liked });
    if (error) return toast.error(error.message);
    if (liked) {
      // For simulated profiles: simulate auto-like back ~70% of the time
      if ((target as any).is_simulated) {
        if (Math.random() < 0.7) {
          await supabase.from("swipes").insert({ swiper_id: target.id, target_id: user.id, liked: true });
          // Manually create match for simulated users (since they can't trigger via auth)
          const a = user.id < target.id ? user.id : target.id;
          const b = user.id < target.id ? target.id : user.id;
          await supabase.from("matches").insert({ user_a: a, user_b: b });
          setMatchModal(target);
        }
      } else {
        // Check if a match was created
        const { data: m } = await supabase.from("matches").select("id").or(`and(user_a.eq.${user.id},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${user.id})`).maybeSingle();
        if (m) setMatchModal(target);
      }
    }
  }

  const top = profiles[0];
  const next = profiles[1];

  return (
    <div className="container max-w-md py-4 pb-24 md:pb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Discover</h1>
          <p className="text-xs text-muted-foreground">Swipe right to like, left to pass</p>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="relative mx-auto aspect-[3/4] max-w-sm">
        {loading && <Card placeholder />}
        {!loading && !top && (
          <div className="grid h-full place-items-center rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <div>
              <Heart className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">You're all caught up!</h3>
              <p className="mt-1 text-sm text-muted-foreground">Check back soon for new people near you.</p>
            </div>
          </div>
        )}
        <AnimatePresence>
          {next && <Card key={next.id} profile={next} stacked />}
          {top && <SwipeCard key={top.id} profile={top} onSwipe={swipe} />}
        </AnimatePresence>
      </div>

      {top && (
        <div className="mt-6 flex items-center justify-center gap-6">
          <button onClick={() => swipe(top, false)} className="grid h-14 w-14 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition hover:scale-105 hover:text-destructive">
            <X className="h-6 w-6" />
          </button>
          <button onClick={() => swipe(top, true)} className="grid h-16 w-16 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow transition hover:scale-105">
            <Heart className="h-7 w-7" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {matchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-3xl gradient-hero p-1 shadow-glow">
              <div className="rounded-3xl bg-card p-6 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground"><Heart className="h-7 w-7" /></div>
                <h2 className="font-display text-3xl font-bold text-gradient">It's a match!</h2>
                <p className="mt-2 text-muted-foreground">You and <strong>{matchModal.display_name}</strong> liked each other.</p>
                <div className="mt-4 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setMatchModal(null)}>Keep swiping</Button>
                  <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => nav("/connect")}>Connect</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function SwipeCard({ profile, onSwipe }: { profile: Profile; onSwipe: (p: Profile, liked: boolean) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOp = useTransform(x, [0, 100], [0, 1]);
  const nopeOp = useTransform(x, [-100, 0], [1, 0]);

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onSwipe(profile, true);
        else if (info.offset.x < -120) onSwipe(profile, false);
      }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <Card profile={profile} />
      <motion.div style={{ opacity: likeOp }} className="pointer-events-none absolute left-4 top-4 rounded-lg border-4 border-primary px-3 py-1 font-bold text-primary rotate-[-15deg]">LIKE</motion.div>
      <motion.div style={{ opacity: nopeOp }} className="pointer-events-none absolute right-4 top-4 rounded-lg border-4 border-destructive px-3 py-1 font-bold text-destructive rotate-[15deg]">NOPE</motion.div>
    </motion.div>
  );
}

function Card({ profile, stacked, placeholder }: { profile?: Profile; stacked?: boolean; placeholder?: boolean }) {
  if (placeholder) return <div className="absolute inset-0 animate-pulse rounded-3xl bg-muted" />;
  if (!profile) return null;
  const photo = profile.photos?.[0];
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-3xl bg-card shadow-card ${stacked ? "scale-95 opacity-70" : ""}`}>
      {photo ? <img src={photo} alt={profile.display_name} className="h-full w-full object-cover" /> :
        <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">No photo</div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
        <h2 className="font-display text-2xl font-bold">{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2>
        {(profile.city || profile.country) && (
          <p className="mt-1 flex items-center gap-1 text-sm opacity-90"><MapPin className="h-3.5 w-3.5" /> {[profile.city, profile.country].filter(Boolean).join(", ")}</p>
        )}
        {profile.bio && <p className="mt-2 line-clamp-2 text-sm opacity-90">{profile.bio}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(profile.interests ?? []).slice(0, 4).map(t => <Badge key={t} variant="secondary" className="bg-white/20 text-white border-0">{t}</Badge>)}
          {(profile.conditions ?? []).slice(0, 2).map(t => <Badge key={t} className="bg-primary/80 text-white border-0">{t.replace(/-/g, " ")}</Badge>)}
        </div>
      </div>
    </div>
  );
}

export default Discover;
