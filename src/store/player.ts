import { create } from "zustand";
import type { Track } from "@/lib/mock-library";

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
  duration: number;
  volume: number;
  ambient: [number, number, number] | null; // dominant RGB from art
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  _setProgress: (t: number) => void;
  _setDuration: (d: number) => void;
  _setIsPlaying: (v: boolean) => void;
  _setAmbient: (rgb: [number, number, number] | null) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  current: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,
  ambient: null,
  setQueue: (queue, startIndex = 0) => {
    const current = queue[startIndex] ?? null;
    set({ queue, index: startIndex, current, isPlaying: !!current, progress: 0 });
  },
  playTrack: (track, queue) => {
    const q = queue ?? get().queue;
    const inQueue = q.findIndex((t) => t.id === track.id);
    if (inQueue >= 0) {
      set({ queue: q, index: inQueue, current: track, isPlaying: true, progress: 0 });
    } else {
      set({ queue: [track], index: 0, current: track, isPlaying: true, progress: 0 });
    }
  },
  toggle: () => {
    if (!get().current) return;
    set({ isPlaying: !get().isPlaying });
  },
  next: () => {
    const { queue, index } = get();
    if (queue.length === 0) return;
    const ni = (index + 1) % queue.length;
    set({ index: ni, current: queue[ni], isPlaying: true, progress: 0 });
  },
  prev: () => {
    const { queue, index, progress } = get();
    if (queue.length === 0) return;
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }
    const ni = (index - 1 + queue.length) % queue.length;
    set({ index: ni, current: queue[ni], isPlaying: true, progress: 0 });
  },
  seek: (t) => set({ progress: t }),
  setVolume: (v) => set({ volume: v }),
  _setProgress: (t) => set({ progress: t }),
  _setDuration: (d) => set({ duration: d }),
  _setIsPlaying: (v) => set({ isPlaying: v }),
  _setAmbient: (rgb) => set({ ambient: rgb }),
}));
