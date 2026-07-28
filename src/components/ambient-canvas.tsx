import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FastAverageColor } from "fast-average-color";
import { usePlayer } from "@/store/player";

// Reson8 signature background: deep near-black navy base with soft magenta
// orbital ring outlines and a teal aurora glow, tinted by the current track.
const fac = new FastAverageColor();

function rgbStr(rgb: [number, number, number], a = 1) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

export function AmbientCanvas() {
  const current = usePlayer((s) => s.current);
  const setAmbient = usePlayer((s) => s._setAmbient);
  // Default tint = magenta/violet (matches reference)
  const [rgb, setRgb] = useState<[number, number, number]>([180, 60, 170]);

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

  const magenta = rgbStr(rgb, 0.55);
  const magentaSoft = rgbStr(rgb, 0.18);
  const teal = "rgba(64, 200, 208, 0.32)";
  const tealSoft = "rgba(64, 200, 208, 0.12)";

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05060d]">
      {/* Base deep navy wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 40%, #0b1024 0%, #06070f 55%, #04040a 100%)",
        }}
      />

      {/* Aurora glows (tinted by track) */}
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
              radial-gradient(38% 32% at 82% 18%, ${teal} 0%, transparent 70%),
              radial-gradient(45% 38% at 12% 78%, ${tealSoft} 0%, transparent 70%),
              radial-gradient(50% 40% at 78% 82%, ${magentaSoft} 0%, transparent 70%),
              radial-gradient(30% 26% at 20% 22%, ${magenta} 0%, transparent 75%)
            `,
            filter: "blur(40px) saturate(130%)",
          }}
        />
      </AnimatePresence>

      {/* Orbital ring outlines — the signature Reson8 curves */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id="ringFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={rgbStr(rgb, 0.55)} />
            <stop offset="70%" stopColor={rgbStr(rgb, 0.15)} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="ringFadeTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(80,220,220,0.35)" />
            <stop offset="70%" stopColor="rgba(80,220,220,0.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Right-side magenta orbits */}
        <g transform="translate(1180 480)" fill="none" strokeWidth="1.2">
          <ellipse rx="520" ry="360" stroke="url(#ringFade)" opacity="0.55" transform="rotate(-18)" />
          <ellipse rx="440" ry="300" stroke="url(#ringFade)" opacity="0.45" transform="rotate(-12)" />
          <ellipse rx="360" ry="240" stroke="url(#ringFade)" opacity="0.35" transform="rotate(-6)" />
          <ellipse rx="600" ry="420" stroke="url(#ringFade)" opacity="0.30" transform="rotate(-24)" />
        </g>

        {/* Left teal orbits */}
        <g transform="translate(240 620)" fill="none" strokeWidth="1.1">
          <ellipse rx="420" ry="280" stroke="url(#ringFadeTeal)" opacity="0.45" transform="rotate(22)" />
          <ellipse rx="520" ry="340" stroke="url(#ringFadeTeal)" opacity="0.30" transform="rotate(28)" />
        </g>
      </svg>

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(3,3,8,0.85)_100%)]" />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
