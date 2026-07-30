import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { setAudioLevel } from "@/lib/audio-level";

// Singleton HTML5 audio element controlled by Zustand. Mounted once inside the
// root layout so playback survives navigation.
export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const seekReq = usePlayer((s) => s.progress);
  const _setProgress = usePlayer((s) => s._setProgress);
  const _setDuration = usePlayer((s) => s._setDuration);
  const next = usePlayer((s) => s.next);
  const lastSeekApplied = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Init element once
  useEffect(() => {
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.preload = "auto";
    audioRef.current = a;
    const onTime = () => {
      _setProgress(a.currentTime);
      lastSeekApplied.current = a.currentTime;
    };
    const onLoaded = () => _setDuration(a.duration || 0);
    const onEnded = () => next();
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [_setProgress, _setDuration, next]);

  // Track change
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!current) {
      a.pause();
      a.removeAttribute("src");
      return;
    }
    if (a.src !== current.previewUrl) {
      a.src = current.previewUrl;
      a.load();
    }
  }, [current]);

  // Play/pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (isPlaying) {
      ensureAnalyser();
      a.play().catch(() => {
        usePlayer.setState({ isPlaying: false });
      });
    } else {
      a.pause();
    }
  }, [isPlaying, current]);

  // Web Audio analyser: created lazily on first play (needs a user gesture).
  function ensureAnalyser() {
    const a = audioRef.current;
    if (!a || analyserRef.current) return;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      // Smaller FFT on phones keeps the per-frame cost negligible.
      analyser.fftSize = window.innerWidth < 768 ? 64 : 128;
      analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    } catch {
      /* analyser unavailable (CORS / unsupported) — visuals fall back to idle */
    }
    ctxRef.current?.resume().catch(() => {});
  }

  // Analyser loop, only while playing.
  useEffect(() => {
    if (!isPlaying) {
      setAudioLevel({ energy: 0, bass: 0, treble: 0 });
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let stop = false;
    const tick = () => {
      if (stop) return;
      const analyser = analyserRef.current;
      if (analyser) {
        const bins = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bins);
        const third = Math.max(1, Math.floor(bins.length / 3));
        let bass = 0;
        let treble = 0;
        let total = 0;
        for (let i = 0; i < bins.length; i++) {
          total += bins[i];
          if (i < third) bass += bins[i];
          else if (i > bins.length - third) treble += bins[i];
        }
        setAudioLevel({
          energy: total / bins.length / 255,
          bass: bass / third / 255,
          treble: treble / third / 255,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stop = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setAudioLevel({ energy: 0, bass: 0, treble: 0 });
    };
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  // External seek: only jump if the store's progress diverges from the audio.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (Math.abs(seekReq - lastSeekApplied.current) > 1.2) {
      a.currentTime = seekReq;
      lastSeekApplied.current = seekReq;
    }
  }, [seekReq]);

  return null;
}
