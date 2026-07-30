import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Shuffle, Heart } from "lucide-react";
import { tracksByIds } from "@/lib/mock-library";
import { TrackRow, TrackListHeader } from "@/components/track-row";
import { usePlayer } from "@/store/player";
import { useLibrary, useLibraryHydrated } from "@/store/library";

export const Route = createFileRoute("/liked")({
  head: () => ({
    meta: [
      { title: "Liked Songs · Reson8" },
      { name: "description", content: "Every track you've saved on Reson8, in one fluid collection." },
      { property: "og:title", content: "Liked Songs · Reson8" },
      { property: "og:description", content: "Every track you've saved on Reson8, in one fluid collection." },
    ],
  }),
  component: LikedPage,
});

function LikedPage() {
  const hydrated = useLibraryHydrated();
  const liked = useLibrary((s) => s.liked);
  const tracks = hydrated ? tracksByIds(liked) : [];
  const setQueue = usePlayer((s) => s.setQueue);
  const playShuffled = usePlayer((s) => s.playShuffled);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row items-start md:items-end gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="grid h-44 w-44 md:h-52 md:w-52 place-items-center rounded-2xl bg-gradient-to-br from-[#ff4fd8] to-[#4fe3ea] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)]"
        >
          <Heart className="h-16 w-16 text-black/70" fill="currentColor" />
        </motion.div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Collection</p>
          <h1 className="mt-1 text-4xl md:text-6xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/75 bg-clip-text text-transparent">
            Liked Songs
          </h1>
          <p className="mt-2 text-xs text-white/40">{tracks.length} tracks</p>
        </div>
      </header>

      {tracks.length > 0 && (
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => setQueue(tracks)}
            className="grid place-items-center h-14 w-14 rounded-full bg-white text-black shadow-[0_0_44px_-4px_rgba(255,255,255,0.6)]"
            aria-label="Play liked songs"
          >
            <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
          </motion.button>
          <button
            onClick={() => playShuffled(tracks)}
            aria-label="Shuffle liked songs"
            className="grid place-items-center h-11 w-11 rounded-full ring-1 ring-white/20 text-white/70 hover:text-white transition-colors"
          >
            <Shuffle className="h-5 w-5" />
          </button>
        </div>
      )}

      {hydrated && tracks.length === 0 ? (
        <p className="text-sm text-white/50">
          Tap the heart on any track and it will land here.
        </p>
      ) : (
        <div>
          <TrackListHeader />
          <div className="mt-2 flex flex-col gap-0.5">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} queue={tracks} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
