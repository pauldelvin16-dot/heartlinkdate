import { NavLink, useLocation } from "react-router-dom";
import { Heart, Home, Sparkles, User as UserIcon, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/discover", icon: Home, label: "Discover" },
  { to: "/matches", icon: Sparkles, label: "Matches" },
  { to: "/connect", icon: Heart, label: "Connect" },
  { to: "/profile", icon: UserIcon, label: "Profile" },
];

export function BottomNav() {
  const { isAdmin } = useAuth();
  const loc = useLocation();
  if (loc.pathname === "/" || loc.pathname.startsWith("/auth") || loc.pathname.startsWith("/onboarding")) return null;
  const nav = isAdmin ? [...items, { to: "/admin", icon: Shield, label: "Admin" }] : items;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg safe-bottom md:hidden">
      <ul className="flex items-stretch justify-around">
        {nav.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
