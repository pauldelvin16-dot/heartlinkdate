import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Play, Send, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type FormField = { name: string; label: string; type?: "text" | "email" | "tel" | "textarea"; required?: boolean };
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
  campaign_type?: "reward" | "traffic" | "engagement" | "awareness" | "leads" | "app_promotion";
  form_fields?: FormField[] | null;
  open_in_new_tab?: boolean;
  app_store_url?: string | null;
  play_store_url?: string | null;
}

const DISMISS_KEY = "hl_ad_dismiss";
function dismissedToday(id: string) {
  try { const r = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); return r[id] === new Date().toISOString().slice(0, 10); } catch { return false; }
}
function dismissAd(id: string) {
  const r = (() => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch { return {}; } })();
  r[id] = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DISMISS_KEY, JSON.stringify(r));
}

// Opens URL in user's actual browser tab (escapes in-app webview when possible)
function openExternal(url: string, newTab = true) {
  try {
    const a = document.createElement("a");
    a.href = url;
    if (newTab) { a.target = "_blank"; a.rel = "noopener noreferrer external"; }
    document.body.appendChild(a); a.click(); a.remove();
  } catch { window.open(url, newTab ? "_blank" : "_self", "noopener,noreferrer"); }
}

function detectStoreUrl(ad: Ad): string | null {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua) && ad.app_store_url) return ad.app_store_url;
  if (/Android/i.test(ua) && ad.play_store_url) return ad.play_store_url;
  return ad.play_store_url || ad.app_store_url || ad.link_url || null;
}

export function AdBanner({ onReward, userCountry }: { onReward?: (n: number) => void; userCountry?: string | null }) {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loggedIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(Date.now());
  const [leadAd, setLeadAd] = useState<Ad | null>(null);
  const [leadForm, setLeadForm] = useState<Record<string, string>>({});

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

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  const banner = useMemo(() => ads.find(a => a.placement === "banner" && !hiddenIds.has(a.id) && !dismissedToday(a.id)), [ads, hiddenIds, now]);
  const floating = useMemo(() => ads.find(a => a.placement === "floating" && !hiddenIds.has(a.id) && !dismissedToday(a.id)), [ads, hiddenIds, now]);

  useEffect(() => {
    [banner, floating].forEach(a => {
      if (a && !loggedIds.has(a.id)) {
        loggedIds.add(a.id);
        (supabase as any).rpc("log_ad_impression", { _ad_id: a.id, _country: userCountry ?? null }).then(() => {});
      }
    });
  }, [banner?.id, floating?.id, userCountry, loggedIds]);

  const [shownAt] = useState<Record<string, number>>({});
  function shownTime(id: string) { if (!shownAt[id]) shownAt[id] = Date.now(); return shownAt[id]; }
  function secondsLeft(a: Ad) { const elapsed = (now - shownTime(a.id)) / 1000; return Math.max(0, (a.skip_after_seconds ?? 5) - Math.floor(elapsed)); }
  function canSkip(a: Ad) { return a.is_skippable !== false ? true : secondsLeft(a) <= 0; }

  async function handleAdAction(a: Ad) {
    const type = a.campaign_type || "reward";

    // Lead form: open modal, don't redirect
    if (type === "leads") { setLeadAd(a); setLeadForm({}); return; }

    // Reward: grant swipes (requires sign-in), then open optional link
    if (type === "reward") {
      if (!user) { if (a.link_url) openExternal(a.link_url, a.open_in_new_tab !== false); return; }
      const { data, error } = await (supabase as any).rpc("click_ad", { _ad_id: a.id });
      if (error) return toast.error(error.message);
      const granted = (data as number) ?? a.reward_swipes;
      toast.success(`+${granted} bonus swipes added! 🎉`);
      onReward?.(granted);
      if (a.link_url) openExternal(a.link_url, a.open_in_new_tab !== false);
      setHiddenIds(s => new Set([...s, a.id]));
      return;
    }

    // App promotion: smart store redirect
    if (type === "app_promotion") {
      // Log click for analytics
      if (user) (supabase as any).rpc("click_ad", { _ad_id: a.id }).catch(() => {});
      const target = detectStoreUrl(a);
      if (target) openExternal(target, true);
      setHiddenIds(s => new Set([...s, a.id]));
      return;
    }

    // Traffic / Engagement / Awareness: log click, open link if provided
    if (user) (supabase as any).rpc("click_ad", { _ad_id: a.id }).catch(() => {});
    if (a.link_url) openExternal(a.link_url, a.open_in_new_tab !== false);
    if (type === "traffic" || type === "engagement") setHiddenIds(s => new Set([...s, a.id]));
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadAd) return;
    const fields = leadAd.form_fields ?? [];
    for (const f of fields) {
      if (f.required && !leadForm[f.name]?.trim()) return toast.error(`${f.label} is required`);
    }
    const payload = {
      ad_id: leadAd.id, user_id: user?.id ?? null,
      name: leadForm.name || leadForm.full_name || null,
      email: leadForm.email || null,
      phone: leadForm.phone || null,
      answers: leadForm,
    };
    const { error } = await (supabase as any).from("ad_leads").insert(payload);
    if (error) return toast.error(error.message);
    if (user) (supabase as any).rpc("click_ad", { _ad_id: leadAd.id }).catch(() => {});
    toast.success("Thanks! We'll be in touch.");
    setHiddenIds(s => new Set([...s, leadAd.id]));
    setLeadAd(null);
    if (leadAd.link_url) openExternal(leadAd.link_url, leadAd.open_in_new_tab !== false);
  }

  function ctaLabel(a: Ad) {
    if (a.cta_text) return a.cta_text;
    switch (a.campaign_type) {
      case "leads": return "Get info";
      case "traffic": return "Visit site";
      case "engagement": return "Learn more";
      case "awareness": return "Discover";
      case "app_promotion": return /Android/i.test(navigator.userAgent) ? "Get on Play" : "Install app";
      default: return `+${a.reward_swipes} swipes`;
    }
  }

  function ctaIcon(a: Ad) {
    if (a.campaign_type === "leads") return <Send className="mr-1 inline h-3 w-3" />;
    if (a.campaign_type === "app_promotion") return <Download className="mr-1 inline h-3 w-3" />;
    if (a.campaign_type === "reward") return <Sparkles className="mr-1 inline h-3 w-3" />;
    return <ExternalLink className="mr-1 inline h-3 w-3" />;
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
              {banner.campaign_type === "reward" && (
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Tap to earn +{banner.reward_swipes} swipes</p>
              )}
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Sponsored · {banner.campaign_type ?? "reward"}</p>
            </div>
            <button onClick={() => handleAdAction(banner)} className="shrink-0 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
              {ctaIcon(banner)} {ctaLabel(banner)}
            </button>
            <button disabled={!canSkip(banner)}
              onClick={() => { if (!canSkip(banner)) return; dismissAd(banner.id); setHiddenIds(s => new Set([...s, banner.id])); }}
              className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              title={canSkip(banner) ? "Skip" : `Skip in ${secondsLeft(banner)}s`}>
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
              <button disabled={!canSkip(floating)}
                onClick={() => { if (!canSkip(floating)) return; dismissAd(floating.id); setHiddenIds(s => new Set([...s, floating.id])); }}
                className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full border border-border bg-card px-1.5 text-muted-foreground shadow-soft hover:text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                title={canSkip(floating) ? "Skip" : `Skip in ${secondsLeft(floating)}s`}>
                {canSkip(floating) ? <X className="h-3 w-3" /> : <span className="text-[10px] font-bold">{secondsLeft(floating)}s</span>}
              </button>
              {floating.video_url && <video src={floating.video_url} muted loop autoPlay playsInline preload="metadata" className="mb-2 h-28 w-full rounded-lg object-cover" />}
              {!floating.video_url && floating.image_url && <img src={floating.image_url} alt="" loading="lazy" decoding="async" className="mb-2 h-24 w-full rounded-lg object-cover" />}
              <p className="text-sm font-bold">{floating.title}</p>
              {floating.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{floating.body}</p>}
              <button onClick={() => handleAdAction(floating)} className="mt-2 w-full rounded-lg gradient-primary py-1.5 text-xs font-bold text-primary-foreground">
                {ctaIcon(floating)} {ctaLabel(floating)}
              </button>
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                Sponsored · {floating.campaign_type ?? "reward"}
                {floating.is_skippable === false && ` · skip in ${floating.skip_after_seconds ?? 5}s`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead form modal */}
      <Dialog open={!!leadAd} onOpenChange={(o) => !o && setLeadAd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{leadAd?.title}</DialogTitle></DialogHeader>
          {leadAd?.body && <p className="text-sm text-muted-foreground">{leadAd.body}</p>}
          <form onSubmit={submitLead} className="space-y-3">
            {(leadAd?.form_fields && leadAd.form_fields.length > 0 ? leadAd.form_fields : [
              { name: "name", label: "Full name", type: "text", required: true },
              { name: "email", label: "Email", type: "email", required: true },
              { name: "phone", label: "Phone", type: "tel" },
            ] as FormField[]).map(f => (
              <div key={f.name}>
                <Label>{f.label}{f.required && " *"}</Label>
                {f.type === "textarea"
                  ? <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={leadForm[f.name] ?? ""} onChange={e => setLeadForm({ ...leadForm, [f.name]: e.target.value })} />
                  : <Input type={f.type ?? "text"} value={leadForm[f.name] ?? ""} onChange={e => setLeadForm({ ...leadForm, [f.name]: e.target.value })} />}
              </div>
            ))}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground"><Send className="mr-1 h-4 w-4" /> Submit</Button>
            <p className="text-[10px] text-center text-muted-foreground">By submitting, you agree this info may be shared with the advertiser.</p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
