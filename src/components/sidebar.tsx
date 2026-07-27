import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Library, Search, Sparkles, Heart, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { playlists } from "@/lib/mock-library";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Your Library", icon: Library },
];

export function Sidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <aside className="hidden md:flex flex-col gap-3 w-[260px] shrink-0 p-3 pr-0">
      <div className="glass-panel flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        <div className="flex items-center gap-2 px-1 pt-1 pb-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-400 via-violet-500 to-cyan-400 shadow-[0_0_24px_-4px_rgba(180,120,255,0.7)]" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-white">Reson8</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              Infinite Sound
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/15"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon className="relative h-[18px] w-[18px]" />
                <span className="relative font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 px-1">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Playlists
            </span>
            <Sparkles className="h-3.5 w-3.5 text-white/40" />
          </div>
          <div className="flex flex-col gap-0.5 overflow-y-auto pr-1 -mr-1 max-h-[calc(100vh-360px)] scrollbar-none">
            {playlists.map((p) => {
              const to = `/playlist/${p.id}`;
              const active = path === to;
              return (
                <Link
                  key={p.id}
                  to="/playlist/$id"
                  params={{ id: p.id }}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                    active ? "bg-white/8 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <img
                    src={p.cover}
                    alt=""
                    className="h-9 w-9 rounded-md object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{p.name}</div>
                    <div className="truncate text-[11px] text-white/40">
                      {p.id === "p5" ? <><Heart className="inline h-3 w-3 mr-1" />Playlist</> : "Playlist"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-auto rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-3">
          <div className="flex items-center gap-2 text-white/90 text-[13px] font-medium">
            <Radio className="h-4 w-4" />
            Connect Spotify
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">
            Sync your real playlists and Liked Songs. Setup guide in chat.
          </p>
          <button
            disabled
            className="mt-2 w-full rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/70 ring-1 ring-white/15 cursor-not-allowed"
          >
            Coming next
          </button>
        </div>
      </div>
    </aside>
  );
}
