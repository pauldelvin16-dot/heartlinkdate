import { NavLink, useLocation } from "react-router-dom";
import { Heart, Home, Sparkles, User as UserIcon, Shield, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

const items = [
  { to: "/discover", icon: Home, label: "Discover", badgeKey: null as null | "messages" },
  { to: "/matches", icon: Sparkles, label: "Matches", badgeKey: "messages" as const },
  { to: "/connect", icon: Heart, label: "Connect", badgeKey: null },
  { to: "/profile", icon: UserIcon, label: "Profile", badgeKey: null },
];

export function BottomNav() {
  const { isAdmin } = useAuth();
  const { counts } = useUnreadCounts();
  const loc = useLocation();
  if (loc.pathname === "/" || loc.pathname.startsWith("/auth") || loc.pathname.startsWith("/onboarding") || loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/chat")) return null;
  const nav = isAdmin ? [...items, { to: "/admin", icon: Shield, label: "Admin", badgeKey: null }] : items;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg safe-bottom md:hidden">
      <ul className="flex items-stretch justify-around">
        {nav.map(({ to, icon: Icon, label, badgeKey }) => {
          const badge = badgeKey === "messages" ? counts.messages : 0;
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1 grid min-w-[16px] h-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
