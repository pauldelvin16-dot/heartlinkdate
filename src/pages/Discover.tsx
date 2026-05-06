import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { Heart, X, MapPin, Sparkles, Crown, Filter, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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
  distance_km?: number | null;
}

const SWIPE_KEY = "hl_swipes_today";
const getTodaySwipes = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SWIPE_KEY) || "{}");
    return raw.date === new Date().toISOString().slice(0, 10) ? raw.count : 0;
  } catch { return 0; }
};
const bumpSwipes = () => {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(SWIPE_KEY, JSON.stringify({ date: today, count: getTodaySwipes() + 1 }));
};

const Discover = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<Profile | null>(null);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterFinancial, setFilterFinancial] = useState("");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [radiusValue, setRadiusValue] = useState(100);
  const [radiusUnit, setRadiusUnit] = useState<"km" | "mi">("km");

  const isPremium = !!me?.is_premium;

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setMe(myProfile);
    if (!myProfile?.gender || (myProfile.photos?.length ?? 0) === 0) { nav("/onboarding"); return; }
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
    if (nearbyOnly && myProfile?.is_premium) {
      const radiusKm = radiusUnit === "mi" ? radiusValue * 1.60934 : radiusValue;
      list = list.filter(p => p.distance_km != null && p.distance_km <= radiusKm);
    }
    setProfiles(list);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, filterCountry, filterFinancial, nearbyOnly, radiusValue, radiusUnit]);

  // Preload next card's image for instant render on slow networks
  useEffect(() => {
    const next = profiles[1]?.photos?.[0];
    if (next) { const i = new Image(); i.src = next; }
  }, [profiles]);

  async function commitSwipe(target: Profile, liked: boolean) {
    if (!user) return;
    if (!isPremium && getTodaySwipes() >= FREE_DAILY_SWIPES) {
      toast.error(`Daily limit reached (${FREE_DAILY_SWIPES}). Upgrade to premium for unlimited swipes.`);
      nav("/connect"); return;
    }
    bumpSwipes();
    setProfiles(p => p.filter(x => x.id !== target.id));
    const { data: swipeResult, error } = await (supabase as any).rpc("upsert_swipe", { _swiper_id: user.id, _target_id: target.id, _liked: liked });
    if (error) {
      if (String(error.message || "").includes("PREMIUM_REQUIRED")) {
        toast.error("Daily free swipe limit reached — upgrade to premium for unlimited.");
        nav("/connect"); return;
      }
      return toast.error(error.message);
    }
    if (liked) {
      if (target.is_simulated) {
        if (Math.random() < 0.7) {
          const { data: simResult } = await (supabase as any).rpc("create_simulated_match", { _user_id: user.id, _target_id: target.id });
          if (simResult?.matched) setMatchModal(target);
        }
      } else {
        if (swipeResult?.matched) setMatchModal(target);
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
            {isPremium
              ? <span className="inline-flex items-center gap-1 text-primary"><Crown className="h-3 w-3" /> Premium · unlimited</span>
              : `${swipesLeft} free swipes left today`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <Button size="sm" onClick={() => nav("/connect")} className="gap-1 gradient-primary text-primary-foreground shadow-glow">
              <Crown className="h-3.5 w-3.5" /> Upgrade
            </Button>
          )}
          <Button size="sm" variant={nearbyOnly ? "default" : "outline"} onClick={() => isPremium ? setNearbyOnly(v => !v) : nav("/connect")} className="gap-1.5">
            <Navigation className="h-3.5 w-3.5" /> Near me
          </Button>
          <Sheet>
            <SheetTrigger asChild><Button size="icon" variant="outline"><Filter className="h-4 w-4" /></Button></SheetTrigger>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium">Location radius</label>
                    <Select value={radiusUnit} onValueChange={(v) => setRadiusUnit(v as "km" | "mi")} disabled={!isPremium}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="km">km</SelectItem><SelectItem value="mi">miles</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Slider disabled={!isPremium} value={[radiusValue]} min={5} max={500} step={5} onValueChange={v => setRadiusValue(v[0] ?? 100)} />
                  <p className="text-xs text-muted-foreground">Within {radiusValue} {radiusUnit}</p>
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
          {next && <Card key={`s-${next.id}`} profile={next} stacked />}
          {top && <SwipeCard key={top.id} profile={top} onSwipe={commitSwipe} />}
        </AnimatePresence>
      </div>

      {top && (
        <div className="mt-6 flex items-center justify-center gap-6">
          <button id="hl-nope-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("hl-fly", { detail: { dir: -1, id: top.id } }))}
            className="grid h-14 w-14 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition active:scale-95 hover:scale-105 hover:text-destructive">
            <X className="h-6 w-6" />
          </button>
          <button id="hl-like-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("hl-fly", { detail: { dir: 1, id: top.id } }))}
            className="grid h-16 w-16 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow transition active:scale-95 hover:scale-105">
            <Heart className="h-7 w-7" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {matchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-full max-w-sm rounded-3xl gradient-hero p-1 shadow-glow">
              <div className="rounded-3xl bg-card p-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring" }}
                  className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground"><Heart className="h-7 w-7" /></motion.div>
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
  const flew = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOp = useTransform(x, [20, 140], [0, 1]);
  const nopeOp = useTransform(x, [-140, -20], [1, 0]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.96, 1, 0.96]);

  function fly(dir: number) {
    if (flew.current) return;
    flew.current = true;
    animate(x, dir * 600, { type: "spring", stiffness: 220, damping: 26, velocity: dir * 800 });
    setTimeout(() => onSwipe(profile, dir > 0), 180);
  }

  useEffect(() => {
    const h = (e: any) => { if (e.detail?.id === profile.id) fly(e.detail.dir); };
    window.addEventListener("hl-fly", h);
    return () => window.removeEventListener("hl-fly", h);
    // eslint-disable-next-line
  }, [profile.id]);

  function handleEnd(_: any, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.15;
    if (power > 140) fly(1);
    else if (power < -140) fly(-1);
    else animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
  }

  return (
    <motion.div
      style={{ x, y, rotate, scale: cardScale }}
      drag
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleEnd}
      whileTap={{ cursor: "grabbing" }}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
    >
      <Card profile={profile} />
      <motion.div style={{ opacity: likeOp }} className="pointer-events-none absolute left-4 top-4 rounded-lg border-4 border-emerald-400 px-3 py-1 font-bold text-emerald-400 rotate-[-15deg] backdrop-blur-sm">LIKE</motion.div>
      <motion.div style={{ opacity: nopeOp }} className="pointer-events-none absolute right-4 top-4 rounded-lg border-4 border-destructive px-3 py-1 font-bold text-destructive rotate-[15deg] backdrop-blur-sm">NOPE</motion.div>
    </motion.div>
  );
}

function Card({ profile, stacked, placeholder }: { profile?: Profile; stacked?: boolean; placeholder?: boolean }) {
  if (placeholder) return <div className="absolute inset-0 animate-pulse rounded-3xl bg-muted" />;
  if (!profile) return null;
  const photo = profile.photos?.[0];
  return (
    <motion.div
      initial={stacked ? false : { scale: 0.95, opacity: 0 }}
      animate={stacked ? { scale: 0.95, opacity: 0.7 } : { scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="absolute inset-0 overflow-hidden rounded-3xl bg-card shadow-card"
    >
      {photo
        ? <img src={photo} alt={profile.display_name} loading="eager" decoding="async" className="h-full w-full object-cover" />
        : <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">No photo</div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 text-white">
        <h2 className="font-display text-2xl font-bold">{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2>
        <p className="mt-1 flex items-center gap-2 text-sm opacity-90">
          {(profile.city || profile.country) && (<><MapPin className="h-3.5 w-3.5" /> {[profile.city, profile.country].filter(Boolean).join(", ")}</>)}
          {profile.distance_km != null && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{profile.distance_km < 1 ? "<1" : Math.round(profile.distance_km)} km</span>}
        </p>
        {profile.bio && <p className="mt-2 line-clamp-2 text-sm opacity-90">{profile.bio}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(profile.interests ?? []).slice(0, 4).map(t => <Badge key={t} variant="secondary" className="bg-white/20 text-white border-0">{t}</Badge>)}
          {(profile.conditions ?? []).slice(0, 2).map(t => <Badge key={t} className="bg-primary/80 text-white border-0">{t.replace(/-/g, " ")}</Badge>)}
        </div>
      </div>
    </motion.div>
  );
}

export default Discover;
