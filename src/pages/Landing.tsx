import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Globe, Shield, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Landing = () => {
  const s = useSiteSettings();
  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
            <Heart className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">{s?.site_name ?? "HeartLink"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth?mode=signup"><Button size="sm" className="gradient-primary text-primary-foreground shadow-glow">Join free</Button></Link>
        </div>
      </header>

      <section className="container relative grid gap-12 py-12 md:grid-cols-2 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Inclusive · UK · EU · USA · AU
          </span>
          <h1 className="mb-4 text-5xl font-bold leading-[1.05] md:text-6xl">
            Find your <span className="text-gradient">spark</span>.<br />Whoever you are.
          </h1>
          <p className="mb-6 max-w-md text-lg text-muted-foreground">
            {s?.tagline ?? "Modern dating built for everyone — gay, straight, mature singles, retired & divorced, widowed, single parents, and people living with conditions. All welcome."}
          </p>
          <div className="mb-6 flex flex-wrap gap-1.5 text-xs">
            {["Retired", "Divorced", "Widowed", "Single parents", "60+", "LGBTQ+", "Living with conditions"].map(t => (
              <span key={t} className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">{t}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth?mode=signup"><Button size="lg" className="gradient-primary text-primary-foreground shadow-glow">Create account</Button></Link>
            <Link to="/install"><Button size="lg" variant="outline"><Smartphone className="mr-2 h-4 w-4" /> Install app</Button></Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
            <Stat icon={Globe} label="Global reach" />
            <Stat icon={Shield} label="Verified phones" />
            <Stat icon={Heart} label="Real matches" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative">
          <div className="absolute -inset-10 -z-10 rounded-full bg-primary/20 blur-3xl" />
          <div className="grid grid-cols-2 gap-4">
            {[
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
              "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400",
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
            ].map((src, i) => (
              <motion.img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className="aspect-[3/4] w-full rounded-3xl object-cover shadow-card"
                style={{ marginTop: i % 2 ? "2rem" : 0 }}
                whileHover={{ y: -6 }}
              />
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {s?.site_name ?? "HeartLink"} · Made with love
      </footer>
    </div>
  );
};

function Stat({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

export default Landing;
