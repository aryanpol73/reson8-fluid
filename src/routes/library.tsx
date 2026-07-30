import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Disc3, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { playlists, albums, artists, getPlaylistTracks, tracksByIds } from "@/lib/mock-library";
import { useLibrary, useLibraryHydrated, playlistTracks } from "@/store/library";
import { usePlayer } from "@/store/player";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library · Reson8" },
      { name: "description", content: "Playlists, albums and artists you've saved on Reson8." },
      { property: "og:title", content: "Your Library · Reson8" },
      { property: "og:description", content: "Playlists, albums and artists you've saved on Reson8." },
    ],
  }),
  component: LibraryPage,
});

type Tab = "playlists" | "albums" | "artists";

function LibraryPage() {
  const [tab, setTab] = useState<Tab>("playlists");
  const hydrated = useLibraryHydrated();
  const userPlaylists = useLibrary((s) => s.playlists);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const setQueue = usePlayer((s) => s.setQueue);

  const tabs: { id: Tab; label: string }[] = [
    { id: "playlists", label: "Playlists" },
    { id: "albums", label: "Albums" },
    { id: "artists", label: "Artists" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Library</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">Your Collection</h1>
        </div>
        <CreatePlaylistDialog />
      </header>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === t.id ? "text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {tab === t.id && (
              <motion.span layoutId="lib-tab" className="absolute inset-0 rounded-full bg-white" />
            )}
            <span className="relative font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "playlists" && (
        <div className="flex flex-col gap-1">
          {hydrated &&
            userPlaylists.map((p) => (
              <div key={p.id} className="group flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-white/[0.05] transition-colors">
                <Link to="/playlist/$id" params={{ id: p.id }} className="flex min-w-0 flex-1 items-center gap-4">
                  {p.cover ? (
                    <img src={p.cover} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10" />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-lg bg-white/10">
                      <Disc3 className="h-5 w-5 text-white/50" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-white/50">
                      {p.description || "Your playlist"} · {p.trackIds.length} tracks
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => setQueue(playlistTracks(p))}
                  disabled={p.trackIds.length === 0}
                  aria-label={`Play ${p.name}`}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                >
                  <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                </button>
                <button
                  onClick={() => {
                    deletePlaylist(p.id);
                    toast("Playlist deleted");
                  }}
                  aria-label={`Delete ${p.name}`}
                  className="grid h-9 w-9 place-items-center rounded-full text-white/40 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

          {playlists.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="group flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-white/[0.05] transition-colors"
            >
              <Link to="/playlist/$id" params={{ id: p.id }} className="flex min-w-0 flex-1 items-center gap-4">
                <img src={p.cover} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs text-white/50">{p.description}</div>
                </div>
              </Link>
              <div className="text-xs text-white/40">{p.trackIds.length} tracks</div>
              <button
                onClick={() => setQueue(getPlaylistTracks(p.id))}
                aria-label={`Play ${p.name}`}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {tab === "albums" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {albums.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              whileHover={{ y: -4 }}
            >
              <Link to="/album/$id" params={{ id: a.id }} className="block group">
                <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
                  <img src={a.cover} alt="" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-3 truncate text-sm font-medium">{a.name}</div>
                <div className="truncate text-xs text-white/50">
                  {a.year} · {a.artist}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {tab === "artists" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {artists.map((a) => (
            <button
              key={a.name}
              onClick={() => setQueue(tracksByIds(a.trackIds))}
              className="group text-center"
            >
              <img
                src={a.cover}
                alt=""
                className="aspect-square w-full rounded-full object-cover ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="mt-3 truncate text-sm font-medium">{a.name}</div>
              <div className="truncate text-xs text-white/50">{a.trackIds.length} tracks</div>
            </button>
          ))}
        </div>
      )}

      {tab === "playlists" && hydrated && userPlaylists.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-white/45">
          <Heart className="h-4 w-4" /> Create your first playlist to see it here.
        </p>
      )}
    </div>
  );
}
