import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { setAudioLevel } from "@/lib/audio-level";
import { resolveTrackAudioUrl } from "@/lib/local-music-db";
import { providerRegistry } from "@/lib/providers";
import type { Track } from "@/lib/mock-library";
import { toast } from "sonner";

async function resolveAnyTrackAudioUrl(track: Track): Promise<string> {
  if (track.source === "audius" || track.source === "jamendo") {
    providerRegistry.cacheTrackMetadata(track);
    try {
      return await providerRegistry.resolveStreamUrlForTrack(track);
    } catch (err) {
      if (track.previewUrl) return track.previewUrl;
      throw err;
    }
  }
  return await resolveTrackAudioUrl(track);
}

// Singleton HTML5 audio element controlled by Zustand. Mounted once inside the
// root layout so playback survives navigation.
export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const seekReq = usePlayer((s) => s.progress);
  const _setProgress = usePlayer((s) => s._setProgress);
  const _setDuration = usePlayer((s) => s._setDuration);
  const next = usePlayer((s) => s.next);
  const lastSeekApplied = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const hasRetriedRef = useRef<Record<string, boolean>>({});

  // Init element once
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;
    const onTime = () => {
      _setProgress(a.currentTime);
      lastSeekApplied.current = a.currentTime;
    };
    const onLoaded = () => _setDuration(a.duration || 0);
    const onEnded = () => next(true);
    const onError = async () => {
      const activeTrack = usePlayer.getState().current;
      if (!activeTrack) return;

      const trackId = activeTrack.id;
      const isOnlineTrack = activeTrack.source === "audius" || activeTrack.source === "jamendo";

      // On error or expiry, attempt re-resolving stream URL once
      if (isOnlineTrack && !hasRetriedRef.current[trackId]) {
        hasRetriedRef.current[trackId] = true;
        try {
          const freshUrl = await providerRegistry.resolveStreamUrlForTrack(activeTrack);
          if (audioRef.current && loadedTrackIdRef.current === trackId) {
            audioRef.current.src = freshUrl;
            audioRef.current.load();
            if (usePlayer.getState().isPlaying) {
              audioRef.current.play().catch(() => {});
            }
            return;
          }
        } catch {
          // Re-resolution failed; proceed to toast and skip
        }
      }

      toast.error(`Playback failed for "${activeTrack.title}". Track is currently unavailable.`);
      usePlayer.setState({ isPlaying: false });
      // Skip to next track
      usePlayer.getState().next(true);
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [_setProgress, _setDuration, next]);

  // Track change with async lazy URL resolution (local or provider)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!current) {
      loadedTrackIdRef.current = null;
      a.pause();
      a.removeAttribute("src");
      return;
    }

    let isCancelled = false;
    loadedTrackIdRef.current = current.id;

    void resolveAnyTrackAudioUrl(current)
      .then((resolvedUrl) => {
        if (isCancelled || !audioRef.current || loadedTrackIdRef.current !== current.id) return;
        const el = audioRef.current;
        if (el.src !== resolvedUrl) {
          el.src = resolvedUrl;
          el.load();
          if (usePlayer.getState().isPlaying) {
            ensureAnalyser();
            el.play().catch((err) => {
              console.warn("Audio autoplay blocked or failed:", err);
              usePlayer.setState({ isPlaying: false });
            });
          }
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        toast.error(`Could not resolve stream: ${(err as Error).message}`);
        usePlayer.getState().next(true);
      });

    // OS / Mobile Lock-Screen Media Session API
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: current.title,
          artist: current.artist,
          album: current.album,
          artwork: current.cover
            ? [
                { src: current.cover, sizes: "96x96", type: "image/png" },
                { src: current.cover, sizes: "256x256", type: "image/png" },
                { src: current.cover, sizes: "512x512", type: "image/png" },
              ]
            : [],
        });

        navigator.mediaSession.setActionHandler("play", () =>
          usePlayer.setState({ isPlaying: true }),
        );
        navigator.mediaSession.setActionHandler("pause", () =>
          usePlayer.setState({ isPlaying: false }),
        );
        navigator.mediaSession.setActionHandler("nexttrack", () => usePlayer.getState().next());
        navigator.mediaSession.setActionHandler("previoustrack", () => usePlayer.getState().prev());
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined) {
            usePlayer.getState().seek(details.seekTime);
          }
        });
      } catch {
        // Ignore unsupported MediaSession features
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [current]);

  // Play/pause and MediaSession playbackState
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (isPlaying) {
      ensureAnalyser();
      a.play().catch((err) => {
        console.warn("Playback prevented:", err);
        usePlayer.setState({ isPlaying: false });
      });
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    } else {
      a.pause();
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  }, [isPlaying, current]);

  // Web Audio analyser: only connected for same-origin or local blob audio.
  // Cross-origin audio streams without CORS would be silenced by the Web Audio specification.
  function ensureAnalyser(audioSrc?: string) {
    const a = audioRef.current;
    if (!a || analyserRef.current) return;

    const url = audioSrc || a.src || "";
    const isLocalOrSameOrigin =
      url.startsWith("blob:") ||
      (typeof window !== "undefined" && url.startsWith(window.location.origin));

    if (!isLocalOrSameOrigin) {
      // Leave cross-origin streams playing directly to the speakers without Web Audio hijacking
      return;
    }

    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = window.innerWidth < 768 ? 64 : 128;
      analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      ctx.resume().catch(() => {});
    } catch {
      /* analyser unavailable - visuals fall back to rhythm simulation */
      analyserRef.current = null;
    }
  }

  // Analyser animation loop
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
      } else {
        // Smooth organic pulse for non-analysed streams
        const now = Date.now() / 1000;
        const pulse = 0.35 + 0.25 * Math.sin(now * 3.2);
        setAudioLevel({
          energy: pulse * 0.7,
          bass: pulse * 0.8,
          treble: pulse * 0.5,
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

  // Volume & Mute
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // External seek: only jump if the store's progress diverges from the audio element
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
