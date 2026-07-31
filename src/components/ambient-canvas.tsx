import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FastAverageColor } from "fast-average-color";
import { usePlayer } from "@/store/player";
import { useAudioLevel } from "@/lib/audio-level";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSettings } from "@/store/settings";

// Reson8 signature background: near-black matte base with interwoven cyan
// and magenta sound-wave ripples that swirl fluidly across the canvas and
// pulse with the music.
const fac = new FastAverageColor();

type RGB = [number, number, number];

function rgbStr(rgb: RGB, a = 1) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

// Push a dull swatch toward a vivid, luminous version so extracted art colors
// always read as neon on the dark base.
function vivid(rgb: RGB, boost = 1.35): RGB {
  const max = Math.max(...rgb) || 1;
  const scale = Math.min(255 / max, boost);
  return rgb.map((c) => Math.min(255, Math.round(40 + c * scale))) as RGB;
}

const DEFAULT_WARM: RGB = [214, 64, 190];
const DEFAULT_COOL: RGB = [80, 220, 230];

export function AmbientCanvas() {
  const current = usePlayer((s) => s.current);
  const setAmbient = usePlayer((s) => s._setAmbient);
  const isMobile = useIsMobile();
  const audioReactive = useSettings((st) => st.audioReactive);
  const intensity = useSettings((st) => st.ambientIntensity);
  const live = useAudioLevel(isMobile ? 8 : 15);
  const energy = audioReactive ? live.energy : 0;
  const bass = audioReactive ? live.bass : 0;
  const treble = audioReactive ? live.treble : 0;

  const [warm, setWarm] = useState<RGB>(DEFAULT_WARM);
  const [cool, setCool] = useState<RGB>(DEFAULT_COOL);

  // Dominant + secondary color extraction from the current album art.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;

    Promise.all([
      fac.getColorAsync(current.cover, { algorithm: "dominant" }),
      fac.getColorAsync(current.cover, { algorithm: "sqrt" }),
    ])
      .then(([dominant, secondary]) => {
        if (cancelled) return;
        const d = vivid([dominant.value[0], dominant.value[1], dominant.value[2]]);
        const s = vivid([secondary.value[0], secondary.value[1], secondary.value[2]], 1.6);
        // Keep the two poles distinguishable; fall back to the signature cyan
        // when the art is monochrome.
        const spread = Math.abs(d[0] - s[0]) + Math.abs(d[1] - s[1]) + Math.abs(d[2] - s[2]);
        setWarm(d);
        setCool(spread > 60 ? s : DEFAULT_COOL);
        setAmbient(d);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [current, setAmbient]);

  // Audio-reactive intensities (clamped so the canvas never strobes).
  const pulse = Math.min(1, energy * 1.4);
  const bassPulse = Math.min(1, bass * 1.5);
  const treblePulse = Math.min(1, treble * 1.6);

  const warmStrong = rgbStr(warm, 0.75 + pulse * 0.25);
  const warmMid = rgbStr(warm, 0.4 + bassPulse * 0.3);
  const warmSoft = rgbStr(warm, 0.14 + bassPulse * 0.14);
  const coolStrong = rgbStr(cool, 0.7 + treblePulse * 0.3);
  const coolMid = rgbStr(cool, 0.34 + treblePulse * 0.28);
  const coolSoft = rgbStr(cool, 0.12 + treblePulse * 0.12);

  // Mobile: fewer layers, cheaper blurs, no heavy SVG glow filters.
  const blurPx = isMobile ? 34 : 50;
  const glowFilter = isMobile ? undefined : "url(#waveGlow)";
  const paletteKey = `${warm.join("-")}|${cool.join("-")}`;

  const auroraBg = useMemo(
    () => `
      radial-gradient(40% 34% at 82% 20%, ${coolMid} 0%, transparent 70%),
      radial-gradient(42% 36% at 14% 74%, ${coolSoft} 0%, transparent 70%),
      radial-gradient(48% 40% at 74% 80%, ${warmSoft} 0%, transparent 70%),
      radial-gradient(32% 28% at 24% 22%, ${warmMid} 0%, transparent 75%)
    `,
    [coolMid, coolSoft, warmSoft, warmMid],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#04050b]"
      style={{ opacity: 0.25 + intensity * 0.75 }}
    >
      {/* Matte near-black base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 55% 45%, #0a0d1c 0%, #06070f 55%, #03040a 100%)",
        }}
      />

      {/* Aurora bleed (color-shifts to track, breathes with the mix) */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`aurora-${paletteKey}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 + pulse * 0.15, scale: 1 + bassPulse * 0.03 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            background: auroraBg,
            filter: `blur(${blurPx}px) saturate(${140 + pulse * 40}%)`,
            willChange: "opacity, transform",
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
          <linearGradient id="waveWarm" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={rgbStr(warm, 0)} />
            <stop offset="35%" stopColor={warmStrong} />
            <stop offset="65%" stopColor={warmStrong} />
            <stop offset="100%" stopColor={rgbStr(warm, 0)} />
          </linearGradient>
          <linearGradient id="waveCool" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={rgbStr(cool, 0)} />
            <stop offset="35%" stopColor={coolStrong} />
            <stop offset="65%" stopColor={coolStrong} />
            <stop offset="100%" stopColor={rgbStr(cool, 0)} />
          </linearGradient>
          {!isMobile && (
            <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
          <filter id="waveGlowSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={isMobile ? 12 : 18} />
          </filter>
        </defs>

        {/* Soft glow halo layer — scales with bass */}
        <motion.g
          filter="url(#waveGlowSoft)"
          animate={{ opacity: 0.55 + bassPulse * 0.35 }}
          transition={{ duration: 0.25 }}
        >
          <path
            d="M -100 520 C 220 360, 480 700, 780 500 S 1360 320, 1750 520"
            stroke="url(#waveWarm)"
            strokeWidth={20 + bassPulse * 16}
            fill="none"
          />
          <path
            d="M -100 560 C 260 760, 560 380, 860 580 S 1400 780, 1750 560"
            stroke="url(#waveCool)"
            strokeWidth={16 + treblePulse * 14}
            fill="none"
          />
        </motion.g>

        {/* Crisp ripple lines — animated flow */}
        <g filter={glowFilter} fill="none" strokeLinecap="round">
          <motion.path
            d="M -100 500 C 220 340, 480 680, 780 480 S 1360 300, 1750 500"
            stroke="url(#waveWarm)"
            strokeWidth={1.6 + bassPulse * 1.4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 + pulse * 0.3 }}
            transition={{ duration: 3.2, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 540 C 240 380, 500 720, 800 520 S 1380 340, 1750 540"
            stroke="url(#waveWarm)"
            strokeWidth="1.2"
            opacity={0.5 + bassPulse * 0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3.6, delay: 0.15, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 560 C 260 760, 560 380, 860 580 S 1400 780, 1750 560"
            stroke="url(#waveCool)"
            strokeWidth={1.6 + treblePulse * 1.4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 + pulse * 0.3 }}
            transition={{ duration: 3.4, ease: "easeInOut" }}
          />
          <motion.path
            d="M -100 600 C 280 800, 580 420, 880 620 S 1420 820, 1750 600"
            stroke="url(#waveCool)"
            strokeWidth="1.1"
            opacity={0.45 + treblePulse * 0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3.8, delay: 0.2, ease: "easeInOut" }}
          />

          {/* Extra detail layers — desktop only */}
          {!isMobile && (
            <>
              <motion.path
                d="M -100 470 C 260 320, 520 640, 820 440 S 1400 280, 1750 470"
                stroke="url(#waveWarm)"
                strokeWidth="0.9"
                opacity="0.55"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 4, delay: 0.3, ease: "easeInOut" }}
              />
              <motion.path
                d="M -100 640 C 300 840, 600 460, 900 660 S 1440 860, 1750 640"
                stroke="url(#waveCool)"
                strokeWidth="0.8"
                opacity="0.45"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 4.2, delay: 0.35, ease: "easeInOut" }}
              />
              <motion.path
                d="M -100 240 C 300 120, 620 340, 940 200 S 1500 100, 1750 220"
                stroke="url(#waveWarm)"
                strokeWidth="1"
                opacity="0.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 4, delay: 0.5, ease: "easeInOut" }}
              />
              <motion.path
                d="M -100 280 C 320 160, 640 380, 960 240 S 1500 140, 1750 260"
                stroke="url(#waveCool)"
                strokeWidth="0.9"
                opacity="0.45"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 4.2, delay: 0.6, ease: "easeInOut" }}
              />
            </>
          )}
        </g>

        {/* Slow drift on the whole wave system (desktop only) */}
        {!isMobile && (
          <motion.g
            animate={{ x: [0, 30, -20, 0], y: [0, -10, 12, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          >
            <g filter="url(#waveGlowSoft)" opacity="0.5">
              <path
                d="M -100 380 C 260 220, 560 560, 860 360 S 1420 200, 1750 380"
                stroke={warmMid}
                strokeWidth="18"
                fill="none"
              />
              <path
                d="M -100 700 C 300 900, 620 520, 920 720 S 1460 920, 1750 700"
                stroke={coolMid}
                strokeWidth="16"
                fill="none"
              />
            </g>
          </motion.g>
        )}
      </svg>

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,3,7,0.9)_100%)]" />

      {/* Subtle grain — skipped on mobile to save fill rate */}
      {!isMobile && (
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
      )}
    </div>
  );
}
