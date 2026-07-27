import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";

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
      a.play().catch(() => {
        usePlayer.setState({ isPlaying: false });
      });
    } else {
      a.pause();
    }
  }, [isPlaying, current]);

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
