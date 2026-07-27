import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import type { Track } from "@/lib/mock-library";
import { usePlayer } from "@/store/player";
import { Equalizer } from "./equalizer";

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TrackRow({
  track,
  index,
  queue,
}: {
  track: Track;
  index: number;
  queue: Track[];
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
      className={`group grid grid-cols-[36px_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_60px] items-center gap-4 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/[0.06] ${
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
              aria-label="Play"
            >
              {isActive && isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <img src={track.cover} alt="" className="h-10 w-10 rounded object-cover ring-1 ring-white/10" />
        <div className="min-w-0">
          <div className={`truncate font-medium ${isActive ? "text-white" : "text-white/90"}`}>
            {track.title}
          </div>
          <div className="truncate text-xs text-white/50">{track.artist}</div>
        </div>
      </div>
      <div className="truncate text-white/55">{track.album}</div>
      <div className="hidden md:block truncate text-white/40 text-xs">{track.artist}</div>
      <div className="text-right tabular-nums text-white/45">{fmt(track.duration)}</div>
    </motion.div>
  );
}
