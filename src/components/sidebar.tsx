import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Library, Search, Heart, Radio, Plus, Disc3 } from "lucide-react";
import { motion } from "framer-motion";
import { playlists } from "@/lib/mock-library";
import { useLibrary, useLibraryHydrated } from "@/store/library";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";
import reson8Logo from "@/assets/reson8-logo.png.asset.json";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Your Library", icon: Library },
];

export function Sidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const hydrated = useLibraryHydrated();
  const userPlaylists = useLibrary((s) => s.playlists);
  const likedCount = useLibrary((s) => s.liked.length);

  return (
    <aside className="hidden md:flex flex-col gap-3 w-[260px] shrink-0 p-3 pr-0">
      <div className="glass-panel flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        <div className="flex items-center gap-2 px-1 pt-1 pb-2">
          <img
            src={reson8Logo.url}
            alt="Reson8"
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/15 shadow-[0_0_24px_-4px_rgba(180,120,255,0.7)]"
          />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-white">Reson8</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Infinite Sound</div>
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
          <Link
            to="/liked"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              path === "/liked" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            <span className="grid place-items-center h-[18px] w-[18px] rounded bg-gradient-to-br from-[#ff4fd8] to-[#4fe3ea]">
              <Heart className="h-2.5 w-2.5 text-black" fill="currentColor" />
            </span>
            <span className="font-medium">Liked Songs</span>
            {hydrated && likedCount > 0 && (
              <span className="ml-auto text-[11px] text-white/40">{likedCount}</span>
            )}
          </Link>
        </nav>

        <div className="mt-2 px-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Playlists</span>
            <CreatePlaylistDialog
              trigger={
                <button
                  aria-label="Create playlist"
                  className="grid place-items-center h-6 w-6 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              }
            />
          </div>
          <div className="flex flex-col gap-0.5 overflow-y-auto pr-1 -mr-1 max-h-[calc(100vh-420px)] scrollbar-none">
            {hydrated &&
              userPlaylists.map((p) => (
                <SidebarPlaylist key={p.id} id={p.id} name={p.name} cover={p.cover} label="Your playlist" active={path === `/playlist/${p.id}`} />
              ))}
            {playlists.map((p) => (
              <SidebarPlaylist key={p.id} id={p.id} name={p.name} cover={p.cover} label="Playlist" active={path === `/playlist/${p.id}`} />
            ))}
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

function SidebarPlaylist({
  id,
  name,
  cover,
  label,
  active,
}: {
  id: string;
  name: string;
  cover: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to="/playlist/$id"
      params={{ id }}
      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
        active ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {cover ? (
        <img src={cover} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-white/10" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-md bg-white/10">
          <Disc3 className="h-4 w-4 text-white/50" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{name}</div>
        <div className="truncate text-[11px] text-white/40">{label}</div>
      </div>
    </Link>
  );
}
