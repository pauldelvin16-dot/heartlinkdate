import { Link, NavLink, useLocation } from "react-router-dom";
import { Heart, Sparkles, User as UserIcon, Shield, Home, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const { user, isAdmin, signOut } = useAuth();
  const settings = useSiteSettings();
  const loc = useLocation();
  if (loc.pathname === "/" || loc.pathname.startsWith("/auth")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to={user ? "/discover" : "/"} className="flex items-center gap-2">
          {settings?.logo_url
            ? <img src={settings.logo_url} alt="logo" className="h-8 w-8 rounded-lg object-cover" />
            : <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary text-primary-foreground"><Heart className="h-4 w-4" /></div>}
          <span className="font-display text-lg font-bold">{settings?.site_name ?? "HeartLink"}</span>
        </Link>
        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            <NavItem to="/discover" icon={Home} label="Discover" />
            <NavItem to="/matches" icon={Sparkles} label="Matches" />
            <NavItem to="/connect" icon={Heart} label="Connect" />
            <NavItem to="/profile" icon={UserIcon} label="Profile" />
            {isAdmin && <NavItem to="/admin" icon={Shield} label="Admin" />}
          </nav>
        )}
        {user && (
          <Button size="sm" variant="ghost" onClick={signOut} className="hidden md:inline-flex">
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        )}
      </div>
    </header>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
      }`}>
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}
