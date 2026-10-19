import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/store/player";
import { Equalizer } from "./equalizer";
import { LikeButton } from "./track-menu";
import { QueuePanel } from "./queue-panel";

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function FloatingPlayer() {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const progress = usePlayer((s) => s.progress);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const setQueueOpen = usePlayer((s) => s.setQueueOpen);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-3 pb-[76px] md:px-6 md:pb-4">
      <QueuePanel />
      <AnimatePresence>
        <motion.div
          key="player"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="pointer-events-auto glass-panel w-full max-w-5xl rounded-2xl px-3 py-2.5 md:px-4 md:py-3"
        >
          <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
            {/* Now playing */}
            <div className="flex items-center gap-3 min-w-0">
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={current?.id ?? "empty"}
                  src={current?.cover ?? "https://picsum.photos/seed/reson8/120/120"}
                  alt=""
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35 }}
                  className="h-12 w-12 md:h-14 md:w-14 rounded-lg object-cover ring-1 ring-white/15 shadow-lg"
                />
              </AnimatePresence>
              <div className="min-w-0">
                <div className="truncate text-[13px] md:text-sm font-semibold text-white">
                  {current?.title ?? "Nothing playing"}
                </div>
                <div className="truncate text-[11px] md:text-xs text-white/55">
                  {current?.artist ?? "Pick a track to begin"}
                </div>
              </div>
              {current && <LikeButton track={current} className="ml-1 h-8 w-8 shrink-0" />}
            </div>

            {/* Transport */}
            <div className="flex flex-col items-center gap-1.5 md:min-w-[380px]">
              <div className="flex items-center gap-2 md:gap-5">
                <button
                  onClick={toggleShuffle}
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  className={`hidden md:grid place-items-center h-8 w-8 rounded-full transition-colors ${
                    shuffle ? "text-[#4fe3ea]" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="grid place-items-center h-8 w-8 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <SkipBack className="h-4 w-4" fill="currentColor" />
                </button>
                <motion.button
                  onClick={toggle}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  className="grid place-items-center h-10 w-10 md:h-11 md:w-11 rounded-full bg-white text-black shadow-[0_0_32px_-4px_rgba(255,255,255,0.55)]"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                  )}
                </motion.button>
                <button
                  onClick={() => next()}
                  aria-label="Next"
                  className="grid place-items-center h-8 w-8 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <SkipForward className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  onClick={cycleRepeat}
                  aria-label={`Repeat ${repeat}`}
                  className={`hidden md:grid place-items-center h-8 w-8 rounded-full transition-colors ${
                    repeat !== "off" ? "text-[#4fe3ea]" : "text-white/50 hover:text-white"
                  }`}
                >
                  {repeat === "one" ? (
                    <Repeat1 className="h-4 w-4" />
                  ) : (
                    <Repeat className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="hidden md:flex items-center gap-2 w-full">
                <span className="tabular-nums text-[10px] text-white/45 w-8 text-right">
                  {fmt(progress)}
                </span>
                <Slider
                  value={[progress]}
                  min={0}
                  max={Math.max(duration, 1)}
                  step={0.1}
                  onValueChange={(v) => seek(v[0])}
                  className="flex-1"
                  aria-label="Seek"
                />
                <span className="tabular-nums text-[10px] text-white/45 w-8">{fmt(duration)}</span>
              </div>
            </div>

            {/* Volume + queue */}
            <div className="hidden md:flex items-center justify-end gap-3">
              <Equalizer playing={isPlaying} className="hidden lg:flex" />
              <button
                onClick={() => setQueueOpen(!queueOpen)}
                aria-label="Queue"
                className={`grid place-items-center h-8 w-8 rounded-full transition-colors ${
                  queueOpen ? "text-white bg-white/10" : "text-white/55 hover:text-white"
                }`}
              >
                <ListMusic className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 w-[140px]">
                <button
                  onClick={toggleMute}
                  aria-label="Mute"
                  className="text-white/55 hover:text-white transition-colors"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <Slider
                  value={[muted ? 0 : volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setVolume(v[0] / 100)}
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          {/* Mobile progress bar */}
          <div className="mt-2 flex md:hidden items-center gap-2">
            <span className="tabular-nums text-[10px] text-white/45 w-8 text-right">
              {fmt(progress)}
            </span>
            <Slider
              value={[progress]}
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              onValueChange={(v) => seek(v[0])}
              className="flex-1"
              aria-label="Seek"
            />
            <span className="tabular-nums text-[10px] text-white/45 w-8">{fmt(duration)}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
