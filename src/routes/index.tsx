import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import {
  getTrack,
  getPlaylistTracks,
  useCatalog,
  type Playlist,
  type Track,
} from "@/lib/mock-library";
import { usePlayer } from "@/store/player";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · Reson8" },
      {
        name: "description",
        content: "Your daily mixes, recent plays, and made-for-you rotations on Reson8.",
      },
      { property: "og:title", content: "Home · Reson8" },
      {
        property: "og:description",
        content: "Your daily mixes, recent plays, and made-for-you rotations on Reson8.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const setQueue = usePlayer((s) => s.setQueue);
  const { playlists, tracks, recentlyPlayed } = useCatalog();
  const recents = recentlyPlayed.map((id) => getTrack(id)!).filter(Boolean);

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Good evening</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
            Infinite Sound, Fluid Design.
          </h1>
        </div>
      </header>

      {/* Quick access grid */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {playlists.slice(0, 6).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Link
                to="/playlist/$id"
                params={{ id: p.id }}
                className="group flex items-center gap-3 rounded-xl bg-white/[0.05] ring-1 ring-white/10 overflow-hidden hover:bg-white/[0.08] transition-colors"
              >
                <img src={p.cover} alt="" className="h-16 w-16 object-cover" />
                <span className="flex-1 truncate pr-3 font-medium text-sm">{p.name}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setQueue(getPlaylistTracks(p.id));
                  }}
                  className="mr-3 opacity-0 group-hover:opacity-100 transition-all grid place-items-center h-10 w-10 rounded-full bg-white text-black shadow-[0_0_24px_-4px_rgba(255,255,255,0.6)]"
                  aria-label={`Play ${p.name}`}
                >
                  <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <PlaylistShelf title="Made for you" items={playlists.slice(0, 4)} />
      <TrackShelf title="Recently played" items={recents} />
      <PlaylistShelf title="Fresh rotations" items={playlists.slice(1, 5)} />
    </div>
  );
}

function PlaylistShelf({ title, items }: { title: string; items: Playlist[] }) {
  const setQueue = usePlayer((s) => s.setQueue);
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-white/40">See all</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group"
          >
            <Link to="/playlist/$id" params={{ id: p.id }} className="block">
              <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)]">
                <img
                  src={p.cover}
                  alt=""
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setQueue(getPlaylistTracks(p.id));
                  }}
                  className="absolute bottom-3 right-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all grid place-items-center h-11 w-11 rounded-full bg-white text-black shadow-[0_10px_30px_-6px_rgba(0,0,0,0.6)]"
                  aria-label={`Play ${p.name}`}
                >
                  <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                </button>
              </div>
              <div className="mt-3">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-white/50">{p.description}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TrackShelf({ title, items }: { title: string; items: Track[] }) {
  const playTrack = usePlayer((s) => s.playTrack);
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.03 }}
            onClick={() => playTrack(t, items)}
            className="group text-left"
          >
            <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10">
              <img src={t.cover} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center h-9 w-9 rounded-full bg-white text-black">
                <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
              </div>
            </div>
            <div className="mt-2 truncate text-[13px] font-medium">{t.title}</div>
            <div className="truncate text-[11px] text-white/50">{t.artist}</div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
