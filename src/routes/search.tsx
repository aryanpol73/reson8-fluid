import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Play } from "lucide-react";
import { tracks } from "@/lib/mock-library";
import { usePlayer } from "@/store/player";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · Reson8" },
      { name: "description", content: "Search tracks, artists, and albums on Reson8." },
      { property: "og:title", content: "Search · Reson8" },
      { property: "og:description", content: "Search tracks, artists, and albums on Reson8." },
    ],
  }),
  component: Search,
});

function Search() {
  const [q, setQ] = useState("");
  const playTrack = usePlayer((s) => s.playTrack);
  const results = useMemo(() => {
    if (!q.trim()) return tracks;
    const needle = q.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.artist.toLowerCase().includes(needle) ||
        t.album.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className="space-y-8">
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Songs, artists, albums…"
          className="w-full rounded-full bg-white/[0.06] ring-1 ring-white/10 focus:ring-white/25 outline-none pl-11 pr-4 py-3 text-sm placeholder:text-white/40 transition-all"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {results.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.3 }}
            whileHover={{ y: -4, scale: 1.03 }}
            onClick={() => playTrack(t, results)}
            className="group text-left"
          >
            <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10">
              <img src={t.cover} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center h-9 w-9 rounded-full bg-white text-black">
                <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
              </div>
            </div>
            <div className="mt-2 truncate text-[13px] font-medium">{t.title}</div>
            <div className="truncate text-[11px] text-white/50">{t.artist}</div>
          </motion.button>
        ))}
        {results.length === 0 && (
          <div className="col-span-full text-sm text-white/50">No results.</div>
        )}
      </div>
    </div>
  );
}
