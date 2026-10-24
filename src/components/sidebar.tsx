import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Library,
  Search,
  Heart,
  ListMusic,
  Disc,
  Users,
  Music2,
  Clock,
  Plus,
  Disc3,
  Settings as SettingsIcon,
  HardDrive,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCatalog } from "@/lib/mock-library";
import { useLibrary, useLibraryHydrated } from "@/store/library";
import { useAuth } from "@/store/auth";
import { GoogleIcon } from "@/components/google-auth-dialog";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";
import reson8Logo from "@/assets/reson8-logo.png.asset.json";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/library", label: "Playlists", icon: ListMusic },
  { to: "/library", label: "Albums", icon: Disc },
  { to: "/library", label: "Artists", icon: Users },
  { to: "/search", label: "Songs", icon: Music2 },
  { to: "/library", label: "Recently Added", icon: Clock },
  { to: "/liked", label: "Favorites", icon: Heart },
];

export function Sidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const hydrated = useLibraryHydrated();
  const userPlaylists = useLibrary((s) => s.playlists);
  const currentUser = useAuth((s) => s.currentUser);
  const setAuthDialogOpen = useAuth((s) => s.setAuthDialogOpen);
  const { playlists } = useCatalog();

  return (
    <aside className="hidden md:flex flex-col gap-3 w-[260px] shrink-0 p-3 pr-0">
      <div className="glass-panel flex-1 flex flex-col gap-3 p-4 overflow-hidden border-white/10 bg-[#080c1b]/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* App Logo */}
        <div className="flex items-center gap-2.5 px-1 pt-1 pb-2">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-50 blur-sm" />
            <img
              src="/icon-512.png"
              alt="Reson8"
              className="relative h-9 w-9 rounded-xl object-cover ring-1 ring-white/20 shadow-md"
            />
          </div>
          <div className="leading-tight">
            <div className="text-[16px] font-bold tracking-tight text-white flex items-center gap-1.5">
              Reson8
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-medium">
              Infinite Sound
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = path === item.to && (item.label === "Home" || path !== "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-all ${
                  active
                    ? "text-white font-medium bg-gradient-to-r from-purple-600/30 to-blue-600/20 ring-1 ring-purple-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-400" : "text-white/50 group-hover:text-white"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Playlists section */}
        <div className="mt-1 px-1 min-h-0 flex flex-col flex-1">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Playlists</span>
            <CreatePlaylistDialog
              trigger={
                <button
                  aria-label="Create playlist"
                  className="grid place-items-center h-6 w-6 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              }
            />
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto pr-1 -mr-1 max-h-[calc(100vh-480px)] scrollbar-none">
            {hydrated &&
              userPlaylists.map((p) => (
                <SidebarPlaylist
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  cover={p.cover}
                  label={`${p.trackIds.length} songs`}
                  active={path === `/playlist/${p.id}`}
                />
              ))}
            {playlists
              .filter((p) => !userPlaylists.some((up) => up.id === p.id))
              .map((p) => (
                <SidebarPlaylist
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  cover={p.cover}
                  label={p.description.split("·")[0] || `${p.trackIds.length} songs`}
                  active={path === `/playlist/${p.id}`}
                />
              ))}
            {hydrated && userPlaylists.length === 0 && playlists.length === 0 && (
              <div className="px-2 py-3 text-center rounded-lg border border-dashed border-white/10 bg-white/[0.02]">
                <p className="text-[11px] text-white/40">No playlists yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-white/5">
          {/* Local Library storage widget */}
          <Link
            to="/settings"
            className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-2.5 hover:bg-white/[0.07] transition-all block"
          >
            <div className="flex items-center justify-between text-xs font-medium text-white/90">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-cyan-400" /> Offline Library
              </span>
              <SettingsIcon className="h-3 w-3 text-white/40" />
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                style={{ width: `${Math.min(Math.max((currentUser?.downloadedTrackIds.length ?? 0) * 10, 8), 100)}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-white/45 flex justify-between font-mono">
              <span>Saved offline</span>
              <span>
                {currentUser?.downloadedTrackIds.length
                  ? `${currentUser.downloadedTrackIds.length} tracks`
                  : "0 tracks"}
              </span>
            </div>
          </Link>

          {/* User Account Widget */}
          {currentUser ? (
            <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-2.5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setAuthDialogOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setAuthDialogOpen(true);
                }}
                className="flex items-center gap-2.5 cursor-pointer group text-left"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-cyan-400 transition-all"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {currentUser.name}
                    </span>
                  </div>
                  <div className="truncate text-[10px] text-white/45">
                    {currentUser.downloadedTrackIds.length} downloaded · {currentUser.musicTaste.split(" ")[0]}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setAuthDialogOpen(true)}
                  className="flex-1 rounded-md bg-white/10 hover:bg-white/15 px-2 py-1 text-center text-[11px] font-medium text-white/80 transition-colors cursor-pointer"
                >
                  Manage Account
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-white/10 p-3">
              <div className="flex items-center gap-2 text-white/90 text-[13px] font-medium">
                <GoogleIcon className="h-4 w-4" />
                Google Account
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                Sign in to create your library, personalized mixes & offline downloads.
              </p>
              <button
                type="button"
                onClick={() => setAuthDialogOpen(true)}
                className="mt-2 flex items-center justify-center gap-2 w-full rounded-lg bg-white/10 px-3 py-1.5 text-center text-[12px] font-medium text-white ring-1 ring-white/15 hover:bg-white/20 transition-all cursor-pointer"
              >
                <GoogleIcon className="h-3.5 w-3.5" />
                Sign in with Google
              </button>
            </div>
          )}
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
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-all ${
        active
          ? "bg-white/[0.08] text-white font-medium shadow-sm"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {cover ? (
        <img src={cover} alt="" className="h-7 w-7 rounded-md object-cover ring-1 ring-white/10 shrink-0" />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 shrink-0">
          <Disc3 className="h-3.5 w-3.5 text-white/50" />
        </span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[12px] font-medium">{name}</div>
        <div className="truncate text-[10px] text-white/40">{label}</div>
      </div>
    </Link>
  );
}
