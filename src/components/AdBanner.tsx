import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Play } from "lucide-react";
import { toast } from "sonner";

interface Ad {
  id: string;
  title: string;
  body: string | null;
  cta_text: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  placement: string;
  reward_swipes: number;
  is_skippable?: boolean;
  skip_after_seconds?: number;
  target_countries?: string[] | null;
}

const DISMISS_KEY = "hl_ad_dismiss";
function dismissedToday(id: string) {
  try {
    const r = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
    return r[id] === new Date().toISOString().slice(0, 10);
  } catch { return false; }
}
function dismissAd(id: string) {
  const r = (() => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch { return {}; } })();
  r[id] = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DISMISS_KEY, JSON.stringify(r));
}

// External browser open (escape any in-app webview where possible)
function openExternal(url: string) {
  try {
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer external";
    document.body.appendChild(a); a.click(); a.remove();
  } catch { window.open(url, "_blank", "noopener,noreferrer"); }
}

export function AdBanner({ onReward, userCountry }: { onReward?: (n: number) => void; userCountry?: string | null }) {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loggedIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const [{ data: site }, { data }] = await Promise.all([
        supabase.from("site_settings").select("ads_enabled").eq("id", 1).maybeSingle(),
        (supabase as any).from("ads").select("*").eq("is_active", true).order("weight", { ascending: false }),
      ]);
      setAdsEnabled(site?.ads_enabled !== false);
      const nowDt = new Date();
      const list = ((data ?? []) as any[]).filter((a) =>
        (!a.starts_at || new Date(a.starts_at) <= nowDt) &&
        (!a.ends_at || new Date(a.ends_at) >= nowDt) &&
        (!a.target_countries?.length || !userCountry || a.target_countries.includes(userCountry))
      );
      setAds(list as Ad[]);
    })();
  }, [userCountry]);

  // tick for skip countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const banner = useMemo(() => ads.find(a => a.placement === "banner" && !hiddenIds.has(a.id) && !dismissedToday(a.id)), [ads, hiddenIds, now]);
  const floating = useMemo(() => ads.find(a => a.placement === "floating" && !hiddenIds.has(a.id) && !dismissedToday(a.id)), [ads, hiddenIds, now]);

  // Track an impression once per render-of-ad
  useEffect(() => {
    [banner, floating].forEach(a => {
      if (a && !loggedIds.has(a.id)) {
        loggedIds.add(a.id);
        (supabase as any).rpc("log_ad_impression", { _ad_id: a.id, _country: userCountry ?? null }).then(() => {});
      }
    });
  }, [banner?.id, floating?.id, userCountry, loggedIds]);

  // Countdown trackers per-ad
  const [shownAt] = useState<Record<string, number>>({});
  function shownTime(id: string) {
    if (!shownAt[id]) shownAt[id] = Date.now();
    return shownAt[id];
  }
  function secondsLeft(a: Ad) {
    const elapsed = (now - shownTime(a.id)) / 1000;
    return Math.max(0, (a.skip_after_seconds ?? 5) - Math.floor(elapsed));
  }
  function canSkip(a: Ad) { return a.is_skippable !== false ? true : secondsLeft(a) <= 0; }

  async function clickAd(a: Ad) {
    if (!user) { if (a.link_url) openExternal(a.link_url); return; }
    const { data, error } = await (supabase as any).rpc("click_ad", { _ad_id: a.id });
    if (error) return toast.error(error.message);
    toast.success(`+${data ?? a.reward_swipes} bonus swipes added! 🎉`);
    onReward?.(data ?? a.reward_swipes);
    if (a.link_url) openExternal(a.link_url);
    setHiddenIds(s => new Set([...s, a.id]));
  }

  if (!adsEnabled) return null;

  return (
    <>
      {banner && (
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="mb-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 shadow-soft">
          <div className="flex items-center gap-3 p-3">
            {banner.image_url && !banner.video_url && <img src={banner.image_url} alt="" loading="lazy" decoding="async" className="h-14 w-14 rounded-lg object-cover" />}
            {banner.video_url && (
              <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-black">
                <video src={banner.video_url} muted loop autoPlay playsInline preload="metadata" className="h-full w-full object-cover" />
                <Play className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{banner.title}</p>
              {banner.body && <p className="truncate text-xs text-muted-foreground">{banner.body}</p>}
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Tap to earn +{banner.reward_swipes} swipes</p>
            </div>
            <button onClick={() => clickAd(banner)} className="shrink-0 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
              <Sparkles className="mr-1 inline h-3 w-3" /> {banner.cta_text || "Claim"}
            </button>
            <button
              disabled={!canSkip(banner)}
              onClick={() => { if (!canSkip(banner)) return; dismissAd(banner.id); setHiddenIds(s => new Set([...s, banner.id])); }}
              className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              title={canSkip(banner) ? "Skip" : `Skip in ${secondsLeft(banner)}s`}
            >
              {canSkip(banner) ? <X className="h-4 w-4" /> : <span className="text-[10px] font-bold">{secondsLeft(banner)}s</span>}
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {floating && (
          <motion.div initial={{ scale: 0, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.4 }}
            className="fixed bottom-20 right-4 z-30 md:bottom-6 md:right-6">
            <div className="relative max-w-[260px] rounded-2xl border border-primary/40 bg-card p-3 shadow-glow">
              <button
                disabled={!canSkip(floating)}
                onClick={() => { if (!canSkip(floating)) return; dismissAd(floating.id); setHiddenIds(s => new Set([...s, floating.id])); }}
                className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full border border-border bg-card px-1.5 text-muted-foreground shadow-soft hover:text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                title={canSkip(floating) ? "Skip" : `Skip in ${secondsLeft(floating)}s`}
              >
                {canSkip(floating) ? <X className="h-3 w-3" /> : <span className="text-[10px] font-bold">{secondsLeft(floating)}s</span>}
              </button>
              {floating.video_url && (
                <video src={floating.video_url} muted loop autoPlay playsInline preload="metadata" className="mb-2 h-28 w-full rounded-lg object-cover" />
              )}
              {!floating.video_url && floating.image_url && (
                <img src={floating.image_url} alt="" loading="lazy" decoding="async" className="mb-2 h-24 w-full rounded-lg object-cover" />
              )}
              <p className="text-sm font-bold">{floating.title}</p>
              {floating.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{floating.body}</p>}
              <button onClick={() => clickAd(floating)} className="mt-2 w-full rounded-lg gradient-primary py-1.5 text-xs font-bold text-primary-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" /> {floating.cta_text || `Get +${floating.reward_swipes} swipes`}
              </button>
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                {floating.is_skippable === false ? `Watch ${floating.skip_after_seconds ?? 5}s — then skip` : "Watch to earn — skip anytime"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
