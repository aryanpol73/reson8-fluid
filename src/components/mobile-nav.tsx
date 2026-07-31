import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Library, Heart, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/liked", label: "Liked", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 glass-panel rounded-none border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                active ? "text-white" : "text-white/50"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
