import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import type { Track } from "@/lib/mock-library";
import { usePlayer } from "@/store/player";
import { Equalizer } from "./equalizer";
import { LikeButton, TrackMenu } from "./track-menu";

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const TRACK_GRID =
  "grid grid-cols-[28px_minmax(0,3fr)_72px] md:grid-cols-[36px_minmax(0,3fr)_minmax(0,2fr)_56px_84px] items-center gap-3 md:gap-4";

export function TrackRow({
  track,
  index,
  queue,
  inPlaylistId,
}: {
  track: Track;
  index: number;
  queue: Track[];
  inPlaylistId?: string;
}) {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setQueue = usePlayer((s) => s.setQueue);
  const toggle = usePlayer((s) => s.toggle);
  const isActive = current?.id === track.id;

  const onPlay = () => {
    if (isActive) toggle();
    else setQueue(queue, queue.findIndex((t) => t.id === track.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.35 }}
      onDoubleClick={onPlay}
      className={`group ${TRACK_GRID} rounded-lg px-2 md:px-3 py-2 text-sm transition-colors hover:bg-white/[0.06] ${
        isActive ? "bg-white/[0.05]" : ""
      }`}
    >
      <div className="relative flex items-center justify-center text-white/40">
        {isActive && isPlaying ? (
          <Equalizer playing className="h-3" />
        ) : (
          <>
            <span className="tabular-nums group-hover:hidden">{index + 1}</span>
            <button
              onClick={onPlay}
              className="hidden group-hover:grid place-items-center text-white"
              aria-label={`Play ${track.title}`}
            >
              <Play className="h-4 w-4" fill="currentColor" />
            </button>
          </>
        )}
      </div>

      <button onClick={onPlay} className="flex items-center gap-3 min-w-0 text-left">
        <img src={track.cover} alt="" className="h-10 w-10 rounded object-cover ring-1 ring-white/10" />
        <div className="min-w-0">
          <div className={`truncate font-medium ${isActive ? "text-white" : "text-white/90"}`}>
            {track.title}
          </div>
          <div className="truncate text-xs text-white/50">{track.artist}</div>
        </div>
      </button>

      <div className="hidden md:block truncate text-white/55">{track.album}</div>
      <div className="hidden md:block text-right tabular-nums text-white/45">{fmt(track.duration)}</div>

      <div className="flex items-center justify-end gap-1">
        <LikeButton track={track} className="h-8 w-8" />
        <TrackMenu track={track} inPlaylistId={inPlaylistId} />
      </div>
    </motion.div>
  );
}

export function TrackListHeader() {
  return (
    <div
      className={`${TRACK_GRID} px-2 md:px-3 pb-2 border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/40`}
    >
      <div className="text-center">#</div>
      <div>Title</div>
      <div className="hidden md:block">Album</div>
      <div className="hidden md:block text-right">Time</div>
      <div />
    </div>
  );
}
