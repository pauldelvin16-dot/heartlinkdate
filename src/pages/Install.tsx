import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Check, Share } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Install = () => {
  const s = useSiteSettings();
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <div className="container max-w-md py-10 pb-24">
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
          <Smartphone className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Install {s?.site_name ?? "HeartLink"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add a shortcut to your home screen — works on Android & iPhone.</p>

        {installed && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
            <Check className="h-4 w-4" /> Installed!
          </div>
        )}

        {!isIOS && (
          <Button onClick={install} disabled={!deferred} className="mt-5 w-full gradient-primary text-primary-foreground shadow-glow">
            {deferred ? "Install on this device" : "Open in Chrome to install"}
          </Button>
        )}

        {isIOS && (
          <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4 text-left text-sm">
            <p className="mb-2 flex items-center gap-2 font-semibold"><Apple className="h-4 w-4" /> Install on iPhone:</p>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Tap the <Share className="mb-0.5 inline h-3.5 w-3.5" /> Share button in Safari</li>
              <li>Choose "Add to Home Screen"</li>
              <li>Tap "Add" — done!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
