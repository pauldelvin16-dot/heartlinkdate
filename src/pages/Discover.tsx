import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Heart, X, MapPin, Sparkles, Crown, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { COUNTRIES, FINANCIAL_OPTS, FREE_DAILY_SWIPES } from "@/lib/constants";

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
  religion?: string | null;
  financial_status?: string | null;
  is_simulated?: boolean;
}

const SWIPE_KEY = "hl_swipes_today";

function getTodaySwipes() {
  try {
    const raw = JSON.parse(localStorage.getItem(SWIPE_KEY) || "{}");
    const today = new Date().toISOString().slice(0, 10);
    return raw.date === today ? raw.count : 0;
  } catch { return 0; }
}
function bumpSwipes() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(SWIPE_KEY, JSON.stringify({ date: today, count: getTodaySwipes() + 1 }));
}

const Discover = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<Profile | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterFinancial, setFilterFinancial] = useState<string>("");

  const isPremium = !!me?.is_premium;

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setMe(myProfile);
    if (!myProfile?.gender || (myProfile.photos?.length ?? 0) === 0) {
      nav("/onboarding"); return;
    }
    const { data: rec, error } = await supabase.rpc("recommend_profiles", { _user_id: user.id, _limit: 60 });
    let list = (rec as Profile[] | null) ?? [];
    if (error) {
      const { data } = await supabase.from("profiles").select("*").eq("is_active", true).neq("id", user.id).limit(60);
      list = (data as Profile[]) ?? [];
    }
    if (myProfile?.is_premium) {
      if (filterCountry) list = list.filter(p => p.country === filterCountry);
      if (filterFinancial) list = list.filter(p => p.financial_status === filterFinancial);
    }
    setProfiles(list);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, filterCountry, filterFinancial]);

  async function swipe(target: Profile, liked: boolean) {
    if (!user) return;
    if (!isPremium && getTodaySwipes() >= FREE_DAILY_SWIPES) {
      toast.error(`Daily limit reached (${FREE_DAILY_SWIPES}). Upgrade to premium for unlimited swipes.`);
      nav("/connect"); return;
    }
    bumpSwipes();
    setProfiles(p => p.filter(x => x.id !== target.id));
    const { error } = await supabase.from("swipes").insert({ swiper_id: user.id, target_id: target.id, liked });
    if (error) return toast.error(error.message);
    if (liked) {
      if (target.is_simulated) {
        if (Math.random() < 0.7) {
          await supabase.from("swipes").insert({ swiper_id: target.id, target_id: user.id, liked: true });
          const a = user.id < target.id ? user.id : target.id;
          const b = user.id < target.id ? target.id : user.id;
          await supabase.from("matches").insert({ user_a: a, user_b: b });
          setMatchModal(target);
        }
      } else {
        const { data: m } = await supabase.from("matches").select("id").or(`and(user_a.eq.${user.id},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${user.id})`).maybeSingle();
        if (m) setMatchModal(target);
      }
    }
  }

  const top = profiles[0];
  const next = profiles[1];
  const swipesLeft = isPremium ? Infinity : Math.max(0, FREE_DAILY_SWIPES - getTodaySwipes());

  return (
    <div className="container max-w-md py-4 pb-24 md:pb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Discover</h1>
          <p className="text-xs text-muted-foreground">
            {isPremium ? <span className="inline-flex items-center gap-1 text-primary"><Crown className="h-3 w-3" /> Premium · unlimited</span>
              : `${swipesLeft} free swipes left today`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline"><Filter className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>Premium filters</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                {!isPremium && (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
                    <Crown className="inline h-4 w-4 text-primary" /> These filters are premium. <button className="underline" onClick={() => nav("/connect")}>Upgrade</button>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Select value={filterCountry} onValueChange={(v) => setFilterCountry(v === "__all" ? "" : v)} disabled={!isPremium}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Any</SelectItem>
                      {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Financial status</label>
                  <Select value={filterFinancial} onValueChange={(v) => setFilterFinancial(v === "__all" ? "" : v)} disabled={!isPremium}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Any</SelectItem>
                      {FINANCIAL_OPTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
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
