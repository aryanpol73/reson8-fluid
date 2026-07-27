import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FastAverageColor } from "fast-average-color";
import { usePlayer } from "@/store/player";

// Fluid mesh gradient that shifts to the dominant colors of the current track.
// Uses fast-average-color on the album art with a low-cost single-pass extract.
const fac = new FastAverageColor();

function rgbStr(rgb: [number, number, number], a = 1) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function shift([r, g, b]: [number, number, number], amt: number): [number, number, number] {
  return [
    Math.min(255, Math.max(0, Math.round(r + amt))),
    Math.min(255, Math.max(0, Math.round(g + amt * 0.6))),
    Math.min(255, Math.max(0, Math.round(b - amt * 0.4))),
  ];
}

export function AmbientCanvas() {
  const current = usePlayer((s) => s.current);
  const setAmbient = usePlayer((s) => s._setAmbient);
  const [rgb, setRgb] = useState<[number, number, number]>([64, 40, 100]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    fac
      .getColorAsync(current.cover, { algorithm: "dominant" })
      .then((color) => {
        if (cancelled) return;
        const next: [number, number, number] = [color.value[0], color.value[1], color.value[2]];
        setRgb(next);
        setAmbient(next);
      })
      .catch(() => {
        /* CORS or load failure — keep previous ambient */
      });
    return () => {
      cancelled = true;
    };
  }, [current, setAmbient]);

  const a = rgbStr(rgb, 0.55);
  const b = rgbStr(shift(rgb, -30), 0.45);
  const c = rgbStr(shift(rgb, 40), 0.35);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0f]">
      <AnimatePresence mode="sync">
        <motion.div
          key={`${rgb[0]}-${rgb[1]}-${rgb[2]}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
          style={{
            background: `
              radial-gradient(60% 60% at 15% 20%, ${a} 0%, transparent 60%),
              radial-gradient(50% 55% at 85% 30%, ${c} 0%, transparent 65%),
              radial-gradient(70% 60% at 50% 90%, ${b} 0%, transparent 70%)
            `,
            filter: "blur(60px) saturate(140%)",
          }}
        />
      </AnimatePresence>
      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(6,6,10,0.75)_100%)]" />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
