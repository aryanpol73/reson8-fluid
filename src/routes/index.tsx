import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Search,
  Settings as SettingsIcon,
  Radio,
  ListMusic,
  FolderOpen,
  Music2,
  Users,
  Disc,
  Sparkles,
  Compass,
  Plus,
  Upload,
} from "lucide-react";
import {
  getTrack,
  getPlaylistTracks,
  useCatalog,
  refreshCatalogFromIndexedDB,
  type Track,
} from "@/lib/mock-library";
import { usePlayer } from "@/store/player";
import { useAuth } from "@/store/auth";
import { useLibrary, useLibraryHydrated } from "@/store/library";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";
import { processAudioFiles } from "@/lib/local-music-db";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reson8 — Infinite Sound, Fluid Design" },
      {
        name: "description",
        content: "Feel the infinite. Live the sound. Your music, your way. Offline. Always.",
      },
      { property: "og:title", content: "Reson8 — Infinite Sound" },
      {
        property: "og:description",
        content: "Feel the infinite. Live the sound. Your music, your way. Offline. Always.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const setQueue = usePlayer((s) => s.setQueue);
  const playTrack = usePlayer((s) => s.playTrack);
  const { playlists, tracks, albums, artists, recentlyPlayed } = useCatalog();
  const hydrated = useLibraryHydrated();
  const userPlaylists = useLibrary((s) => s.playlists);
  const recentTrackIds = useLibrary((s) => s.recent);
  const currentUser = useAuth((s) => s.currentUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/search" });
    }
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsImporting(true);
      const entries = Array.from(files).map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
      }));
      const imported = await processAudioFiles(entries);
      await refreshCatalogFromIndexedDB();
      toast.success(`Imported ${imported.length} audio tracks to your library`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  // Resolve genuine recently played tracks from library store or indexed tracks
  const resolvedRecentTracks: Track[] = (recentTrackIds.length > 0 ? recentTrackIds : recentlyPlayed)
    .map(getTrack)
    .filter((t): t is Track => Boolean(t))
    .slice(0, 5);

  const allUserPlaylists = [
    ...userPlaylists,
    ...playlists.filter((p) => !userPlaylists.some((up) => up.id === p.id)),
  ];

  const hasAnyMusic = tracks.length > 0 || allUserPlaylists.length > 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden file picker for direct Import Music action */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.m4a,.flac,.wav,.ogg,.aac"
        className="hidden"
        onChange={handleImportFiles}
      />

      {/* Top Search Bar & Settings Header */}
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search music, artists, albums..."
            className="w-full rounded-full bg-white/[0.06] border border-white/10 pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition-all shadow-inner"
          />
        </form>

        <Link
          to="/settings"
          aria-label="Settings"
          className="grid place-items-center h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* Hero Section with Reson8 Identity */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1228]/90 via-[#090e20]/80 to-[#060814]/90 p-6 md:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-fuchsia-600/20 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-lg">
            <p className="text-xs uppercase font-semibold tracking-[0.25em] text-fuchsia-400">
              Reson8 · Infinite Sound
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.15]">
              Feel the infinite. <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
                Live the sound.
              </span>
            </h1>
            <p className="text-xs md:text-sm text-white/60 pt-1 font-medium">
              {currentUser
                ? `Welcome back, ${currentUser.name}. Your offline music sanctuary.`
                : "Welcome to your music space. Choose how you want to get started."}
            </p>
          </div>

          <div className="relative shrink-0 flex items-center justify-center">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-40 blur-xl" />
            <img
              src="/icon-512.png"
              alt="Reson8 Soundwave"
              className="relative h-40 w-40 md:h-48 md:w-48 rounded-2xl object-cover ring-2 ring-white/20 shadow-[0_0_50px_rgba(180,80,255,0.4)]"
            />
          </div>
        </div>
      </section>

      {/* Clean First-Time Actions Section: Import Music, Build Library, Explore, Create Playlist, Start Listening */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-white/90">Get Started</h2>
          <span className="text-xs text-white/40">Clean, user-driven actions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Action A: Import Music */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/40 p-4 transition-all text-left shadow-sm cursor-pointer"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
              {isImporting ? "Importing…" : "Import Music"}
            </div>
            <div className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
              Select local audio files (MP3, FLAC, M4A)
            </div>
          </button>

          {/* Action B: Build Your Library */}
          <Link
            to="/settings"
            className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-emerald-400/40 p-4 transition-all block shadow-sm"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform mb-3">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-emerald-300 transition-colors">
              Build Library
            </div>
            <div className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
              Index folders & extract album metadata
            </div>
          </Link>

          {/* Action C: Explore Music */}
          <Link
            to="/search"
            className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-sky-400/40 p-4 transition-all block shadow-sm"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform mb-3">
              <Compass className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-sky-300 transition-colors">
              Explore Music
            </div>
            <div className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
              Discover Audius & Jamendo streams
            </div>
          </Link>

          {/* Action D: Create a Playlist */}
          <CreatePlaylistDialog
            trigger={
              <button className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-fuchsia-400/40 p-4 transition-all text-left shadow-sm cursor-pointer w-full">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 group-hover:scale-105 transition-transform mb-3">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-white group-hover:text-fuchsia-300 transition-colors">
                  Create Playlist
                </div>
                <div className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
                  Make your own custom playlist
                </div>
              </button>
            }
          />

          {/* Action E: Start Listening */}
          <button
            onClick={() => {
              if (tracks.length > 0) {
                setQueue(tracks);
              } else {
                navigate({ to: "/search" });
              }
            }}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-purple-400/40 p-4 transition-all text-left shadow-sm cursor-pointer"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform mb-3">
              <Play className="h-5 w-5 ml-0.5" />
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">
              Start Listening
            </div>
            <div className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
              {tracks.length > 0 ? "Play available library tracks" : "Search and stream music"}
            </div>
          </button>
        </div>
      </section>

      {/* Genuine Library Overview — dynamic real counts calculated directly from user data */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-white/90">Your Library Overview</h2>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Songs */}
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <Music2 className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-medium">Songs</div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {tracks.length}
              </div>
            </div>
          </div>

          {/* Artists */}
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-medium">Artists</div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {artists.length}
              </div>
            </div>
          </div>

          {/* Albums */}
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Disc className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-medium">Albums</div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {albums.length}
              </div>
            </div>
          </div>

          {/* Playlists */}
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400 shrink-0">
              <ListMusic className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-medium">Playlists</div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {allUserPlaylists.length}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Played — only shown when genuine playback history exists */}
      {resolvedRecentTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-white/90">Recently Played</h2>
            <Link to="/library" className="text-xs text-white/40 hover:text-white transition-colors">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {resolvedRecentTracks.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] p-3 transition-all flex flex-col cursor-pointer"
                onClick={() => playTrack(track, resolvedRecentTracks)}
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden ring-1 ring-white/15 shadow-md">
                  {track.cover ? (
                    <img
                      src={track.cover}
                      alt={track.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/5 flex items-center justify-center">
                      <Music2 className="h-8 w-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-lg shadow-black/50">
                      <Play className="h-5 w-5 ml-0.5 fill-current" />
                    </span>
                  </div>
                </div>
                <div className="mt-3 truncate text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  {track.title}
                </div>
                <div className="truncate text-[11px] text-white/50 mt-0.5">
                  {track.artist}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* User Playlists — only shown when playlists actually exist */}
      {allUserPlaylists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              {currentUser ? `Playlists for ${currentUser.name.split(" ")[0]}` : "Your Playlists"}
            </h2>
            <Link to="/library" className="text-xs text-white/40 hover:text-white transition-colors">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {allUserPlaylists.slice(0, 5).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
              >
                <Link
                  to="/playlist/$id"
                  params={{ id: p.id }}
                  className="group block rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] p-3 transition-all"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden ring-1 ring-white/15">
                    {p.cover ? (
                      <img
                        src={p.cover}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/5 flex items-center justify-center">
                        <ListMusic className="h-8 w-8 text-white/30" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const pTracks = getPlaylistTracks(p.id);
                        if (pTracks.length > 0) setQueue(pTracks);
                      }}
                      className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all grid place-items-center h-10 w-10 rounded-full bg-white text-black shadow-lg shadow-black/40 hover:scale-105"
                      aria-label={`Play ${p.name}`}
                    >
                      <Play className="h-4 w-4 ml-0.5 fill-current" />
                    </button>
                  </div>
                  <div className="mt-3 truncate text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {p.name}
                  </div>
                  <div className="truncate text-[11px] text-white/50 mt-0.5">
                    {p.description || `${p.trackIds.length} tracks`}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Clean informative note when library is completely empty */}
      {!hasAnyMusic && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto text-cyan-400">
            <Radio className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">Your music sanctuary is ready</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
              Reson8 doesn't use fake songs or simulated data. Import your own audio files, search Audius and Jamendo streams, or create your first playlist.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Import Audio Files
            </button>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/15 text-xs font-medium transition-colors"
            >
              <Compass className="h-4 w-4" /> Discover Online
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
