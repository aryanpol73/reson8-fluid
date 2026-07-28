import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FastAverageColor } from "fast-average-color";
import { usePlayer } from "@/store/player";

// Reson8 signature background: near-black matte base with interwoven cyan
// and magenta sound-wave ripples that swirl fluidly across the canvas.
const fac = new FastAverageColor();

function rgbStr(rgb: [number, number, number], a = 1) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

export function AmbientCanvas() {
  const current = usePlayer((s) => s.current);
  const setAmbient = usePlayer((s) => s._setAmbient);
  const [rgb, setRgb] = useState<[number, number, number]>([214, 64, 190]);

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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [current, setAmbient]);

  const magentaStrong = rgbStr(rgb, 0.95);
  const magentaMid = rgbStr(rgb, 0.55);
  const magentaSoft = rgbStr(rgb, 0.18);
  const cyanStrong = "rgba(80, 220, 230, 0.85)";
  const cyanMid = "rgba(80, 220, 230, 0.45)";
  const cyanSoft = "rgba(80, 220, 230, 0.15)";

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#04050b]">
      {/* Matte near-black base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 55% 45%, #0a0d1c 0%, #06070f 55%, #03040a 100%)",
        }}
      />

      {/* Aurora bleed (color-shifts to track) */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`aurora-${rgb.join("-")}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
          style={{
            background: `
              radial-gradient(40% 34% at 82% 20%, ${cyanMid} 0%, transparent 70%),
              radial-gradient(42% 36% at 14% 74%, ${cyanSoft} 0%, transparent 70%),
              radial-gradient(48% 40% at 74% 80%, ${magentaSoft} 0%, transparent 70%),
              radial-gradient(32% 28% at 24% 22%, ${magentaMid} 0%, transparent 75%)
            `,
            filter: "blur(50px) saturate(140%)",
          }}
        />
      </AnimatePresence>

      {/* Fluid interwoven sound-wave ripples */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="waveMagenta" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={rgbStr(rgb, 0)} />
            <stop offset="35%" stopColor={magentaStrong} />
            <stop offset="65%" stopColor={magentaStrong} />
            <stop offset="100%" stopColor={rgbStr(rgb, 0)} />
          </linearGradient>
          <linearGradient id="waveCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(80,220,230,0)" />
            <stop offset="35%" stopColor={cyanStrong} />
            <stop offset="65%" stopColor={cyanStrong} />
            <stop offset="100%" stopColor="rgba(80,220,230,0)" />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="waveGlowSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* Soft glow halo layer */}
        <g filter="url(#waveGlowSoft)" opacity="0.75">
          <path
            d="M -100 520 C 220 360, 480 700, 780 500 S 1360 320, 1750 520"
            stroke="url(#waveMagenta)"
            strokeWidth="26"
            fill="none"
          />
          <path
            d="M -100 560 C 260 760, 560 380, 860 580 S 1400 780, 1750 560"
            stroke="url(#waveCyan)"
            strokeWidth="22"
            fill="none"
          />
        </g>

        {/* Crisp ripple lines — animated flow */}
        <g filter="url(#waveGlow)" fill="none" strokeLinecap="round">
          {/* Magenta family */}
          <motion.path
            d="M -100 500 C 220 340, 480 680, 780 480 S 1360 300, 1750 500"
            stroke="url(#waveMagenta)"
            strokeWidth="1.6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 3.2, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 540 C 240 380, 500 720, 800 520 S 1380 340, 1750 540"
            stroke="url(#waveMagenta)"
            strokeWidth="1.2"
            opacity="0.7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3.6, delay: 0.15, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 470 C 260 320, 520 640, 820 440 S 1400 280, 1750 470"
            stroke="url(#waveMagenta)"
            strokeWidth="0.9"
            opacity="0.55"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, delay: 0.3, ease: "easeInOut" }}
          />

          {/* Cyan family, phase-shifted to weave */}
          <motion.path
            d="M -100 560 C 260 760, 560 380, 860 580 S 1400 780, 1750 560"
            stroke="url(#waveCyan)"
            strokeWidth="1.6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 3.4, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 600 C 280 800, 580 420, 880 620 S 1420 820, 1750 600"
            stroke="url(#waveCyan)"
            strokeWidth="1.1"
            opacity="0.65"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3.8, delay: 0.2, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 640 C 300 840, 600 460, 900 660 S 1440 860, 1750 640"
            stroke="url(#waveCyan)"
            strokeWidth="0.8"
            opacity="0.45"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4.2, delay: 0.35, ease: "easeInOut" }}
          />

          {/* Upper interwoven arcs */}
          <motion.path
            d="M -100 240 C 300 120, 620 340, 940 200 S 1500 100, 1750 220"
            stroke="url(#waveMagenta)"
            strokeWidth="1"
            opacity="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, delay: 0.5, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 280 C 320 160, 640 380, 960 240 S 1500 140, 1750 260"
            stroke="url(#waveCyan)"
            strokeWidth="0.9"
            opacity="0.45"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4.2, delay: 0.6, ease: "easeInOut" }}
          />
        </g>

        {/* Slow drift on the whole wave system */}
        <motion.g
          animate={{ x: [0, 30, -20, 0], y: [0, -10, 12, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        >
          <g filter="url(#waveGlowSoft)" opacity="0.5">
            <path
              d="M -100 380 C 260 220, 560 560, 860 360 S 1420 200, 1750 380"
              stroke={magentaMid}
              strokeWidth="18"
              fill="none"
            />
            <path
              d="M -100 700 C 300 900, 620 520, 920 720 S 1460 920, 1750 700"
              stroke={cyanMid}
              strokeWidth="16"
              fill="none"
            />
          </g>
        </motion.g>
      </svg>

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,3,7,0.9)_100%)]" />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
