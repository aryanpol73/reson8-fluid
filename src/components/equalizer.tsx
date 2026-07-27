import { motion } from "framer-motion";

// Minimalist animated equalizer. Pure CSS-driven via Framer keyframes; no
// AnalyserNode dependency so it works with any audio backend swap.
export function Equalizer({ playing, className = "" }: { playing: boolean; className?: string }) {
  const bars = [0.5, 0.9, 0.7, 1, 0.6];
  return (
    <div className={`flex items-end gap-[3px] h-4 ${className}`}>
      {bars.map((peak, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-white/90"
          animate={
            playing
              ? { scaleY: [0.3, peak, 0.5, peak * 0.8, 0.4] }
              : { scaleY: 0.3 }
          }
          transition={{
            duration: 0.9 + i * 0.12,
            repeat: playing ? Infinity : 0,
            ease: "easeInOut",
          }}
          style={{ height: "100%", transformOrigin: "bottom" }}
        />
      ))}
    </div>
  );
}
