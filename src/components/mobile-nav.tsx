import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Library, Heart, Settings } from "lucide-react";
import { motion } from "framer-motion";

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
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-[#080c1d]/95 backdrop-blur-3xl border-t border-white/10 px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+6px)] shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
      <div className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-all ${
                active ? "text-cyan-400" : "text-white/50 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active-pill"
                  className="absolute -top-1 h-0.5 w-6 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                />
              )}
              <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110 text-cyan-400" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
