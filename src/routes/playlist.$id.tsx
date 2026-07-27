import { createFileRoute, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Clock, Heart, Shuffle } from "lucide-react";
import { getPlaylist, getPlaylistTracks } from "@/lib/mock-library";
import { TrackRow } from "@/components/track-row";
import { usePlayer } from "@/store/player";

export const Route = createFileRoute("/playlist/$id")({
  head: ({ params }) => {
    const p = getPlaylist(params.id);
    const title = p ? `${p.name} · Reson8` : "Playlist · Reson8";
    const description = p?.description ?? "A Reson8 playlist.";
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
    const p = getPlaylist(params.id);
    if (!p) throw notFound();
    return { playlist: p };
  },
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlist } = Route.useLoaderData();
  const tracks = getPlaylistTracks(playlist.id);
  const setQueue = usePlayer((s) => s.setQueue);
  const totalSec = tracks.reduce((a, t) => a + t.duration, 0);
  const min = Math.round(totalSec / 60);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row items-end gap-6">
        <motion.img
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          src={playlist.cover}
          alt=""
          className="h-44 w-44 md:h-52 md:w-52 rounded-2xl object-cover ring-1 ring-white/15 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)]"
        />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Playlist</p>
          <h1 className="mt-1 text-4xl md:text-6xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/75 bg-clip-text text-transparent">
            {playlist.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60">{playlist.description}</p>
          <p className="mt-2 text-xs text-white/40">
            {tracks.length} tracks · {min} min
          </p>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04 }}
          onClick={() => setQueue(tracks)}
          className="grid place-items-center h-14 w-14 rounded-full bg-white text-black shadow-[0_0_44px_-4px_rgba(255,255,255,0.6)]"
          aria-label="Play playlist"
        >
          <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
        </motion.button>
        <button className="grid place-items-center h-11 w-11 rounded-full ring-1 ring-white/20 text-white/70 hover:text-white transition-colors">
          <Shuffle className="h-5 w-5" />
        </button>
        <button className="grid place-items-center h-11 w-11 rounded-full ring-1 ring-white/20 text-white/70 hover:text-white transition-colors">
          <Heart className="h-5 w-5" />
        </button>
      </div>

      <div>
        <div className="grid grid-cols-[36px_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_60px] items-center gap-4 px-3 pb-2 border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/40">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Album</div>
          <div className="hidden md:block">Artist</div>
          <div className="text-right"><Clock className="inline h-3.5 w-3.5" /></div>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} queue={tracks} />
          ))}
        </div>
      </div>
    </div>
  );
}
