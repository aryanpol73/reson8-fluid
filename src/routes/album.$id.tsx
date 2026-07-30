import { createFileRoute, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Shuffle, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { getAlbum, getAlbumTracks } from "@/lib/mock-library";
import { TrackRow, TrackListHeader } from "@/components/track-row";
import { usePlayer } from "@/store/player";
import { useLibrary, useLibraryHydrated } from "@/store/library";

export const Route = createFileRoute("/album/$id")({
  head: ({ params }) => {
    const a = getAlbum(params.id);
    const title = a ? `${a.name} · ${a.artist} · Reson8` : "Album · Reson8";
    const description = a
      ? `Listen to ${a.name} by ${a.artist} (${a.year}) on Reson8.`
      : "An album on Reson8.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  loader: ({ params }) => {
    const album = getAlbum(params.id);
    if (!album) throw notFound();
    return { album };
  },
  component: AlbumPage,
});

function AlbumPage() {
  const { album } = Route.useLoaderData();
  const tracks = getAlbumTracks(album.id);
  const setQueue = usePlayer((s) => s.setQueue);
  const playShuffled = usePlayer((s) => s.playShuffled);
  const hydrated = useLibraryHydrated();
  const saved = useLibrary((s) => s.savedAlbums.includes(album.id));
  const toggleSaveAlbum = useLibrary((s) => s.toggleSaveAlbum);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const min = Math.round(tracks.reduce((a, t) => a + t.duration, 0) / 60);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row items-start md:items-end gap-6">
        <motion.img
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          src={album.cover}
          alt=""
          className="h-44 w-44 md:h-52 md:w-52 rounded-2xl object-cover ring-1 ring-white/15 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)]"
        />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Album</p>
          <h1 className="mt-1 text-4xl md:text-6xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/75 bg-clip-text text-transparent">
            {album.name}
          </h1>
          <p className="mt-3 text-sm text-white/60">{album.artist}</p>
          <p className="mt-1 text-xs text-white/40">
            {album.year} · {tracks.length} tracks · {min} min
          </p>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04 }}
          onClick={() => setQueue(tracks)}
          className="grid place-items-center h-14 w-14 rounded-full bg-white text-black shadow-[0_0_44px_-4px_rgba(255,255,255,0.6)]"
          aria-label="Play album"
        >
          <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
        </motion.button>
        <button
          onClick={() => playShuffled(tracks)}
          aria-label="Shuffle album"
          className="grid place-items-center h-11 w-11 rounded-full ring-1 ring-white/20 text-white/70 hover:text-white transition-colors"
        >
          <Shuffle className="h-5 w-5" />
        </button>
        <button
          onClick={() => toggleSaveAlbum(album.id)}
          aria-label={saved ? "Remove album" : "Save album"}
          className={`grid place-items-center h-11 w-11 rounded-full ring-1 ring-white/20 transition-colors ${
            hydrated && saved ? "text-[#ff4fd8]" : "text-white/70 hover:text-white"
          }`}
        >
          <Heart className="h-5 w-5" fill={hydrated && saved ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => {
            createPlaylist(album.name, `From the album ${album.name}`, album.trackIds);
            toast.success("Saved as playlist");
          }}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/70 ring-1 ring-white/20 hover:text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> Save as playlist
        </button>
      </div>

      <div>
        <TrackListHeader />
        <div className="mt-2 flex flex-col gap-0.5">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} queue={tracks} />
          ))}
        </div>
      </div>
    </div>
  );
}
