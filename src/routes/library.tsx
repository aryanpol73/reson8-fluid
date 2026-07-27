import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { playlists } from "@/lib/mock-library";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library · Reson8" },
      { name: "description", content: "All your Reson8 playlists in one place." },
      { property: "og:title", content: "Your Library · Reson8" },
      { property: "og:description", content: "All your Reson8 playlists in one place." },
    ],
  }),
  component: Library,
});

function Library() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Library</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">Your Playlists</h1>
      </header>
      <div className="flex flex-col gap-1">
        {playlists.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
          >
            <Link
              to="/playlist/$id"
              params={{ id: p.id }}
              className="flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-white/[0.05] transition-colors"
            >
              <img src={p.cover} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name}</div>
                <div className="truncate text-xs text-white/50">{p.description}</div>
              </div>
              <div className="text-xs text-white/40">{p.trackIds.length} tracks</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
