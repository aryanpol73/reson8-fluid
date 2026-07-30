import { create } from "zustand";
import type { Track } from "@/lib/mock-library";
import { useLibrary } from "@/store/library";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queueOpen: boolean;
  ambient: [number, number, number] | null; // dominant RGB from art
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  playShuffled: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  jumpTo: (index: number) => void;
  toggle: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setQueueOpen: (v: boolean) => void;
  _setProgress: (t: number) => void;
  _setDuration: (d: number) => void;
  _setIsPlaying: (v: boolean) => void;
  _setAmbient: (rgb: [number, number, number] | null) => void;
}

const shuffleArray = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const remember = (track: Track | null) => {
  if (track) useLibrary.getState().pushRecent(track.id);
};

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  current: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queueOpen: false,
  ambient: null,

  setQueue: (queue, startIndex = 0) => {
    const current = queue[startIndex] ?? null;
    remember(current);
    set({ queue, index: startIndex, current, isPlaying: !!current, progress: 0 });
  },

  playTrack: (track, queue) => {
    const q = queue ?? get().queue;
    const inQueue = q.findIndex((t) => t.id === track.id);
    remember(track);
    if (inQueue >= 0) {
      set({ queue: q, index: inQueue, current: track, isPlaying: true, progress: 0 });
    } else {
      set({ queue: [track], index: 0, current: track, isPlaying: true, progress: 0 });
    }
  },

  playShuffled: (tracks) => {
    const queue = shuffleArray(tracks);
    remember(queue[0] ?? null);
    set({ queue, index: 0, current: queue[0] ?? null, isPlaying: queue.length > 0, progress: 0, shuffle: true });
  },

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

  playNext: (track) =>
    set((s) => {
      const queue = [...s.queue];
      queue.splice(s.index + 1, 0, track);
      return { queue };
    }),

  removeFromQueue: (i) =>
    set((s) => {
      if (i === s.index) return s;
      const queue = s.queue.filter((_, idx) => idx !== i);
      return { queue, index: i < s.index ? s.index - 1 : s.index };
    }),

  clearQueue: () =>
    set((s) => ({ queue: s.current ? [s.current] : [], index: s.current ? 0 : -1 })),

  jumpTo: (i) => {
    const { queue } = get();
    const track = queue[i];
    if (!track) return;
    remember(track);
    set({ index: i, current: track, isPlaying: true, progress: 0 });
  },

  toggle: () => {
    if (!get().current) return;
    set({ isPlaying: !get().isPlaying });
  },

  next: (auto = false) => {
    const { queue, index, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (auto && repeat === "one") {
      set({ progress: 0, isPlaying: true });
      return;
    }
    let ni: number;
    if (shuffle && queue.length > 1) {
      do {
        ni = Math.floor(Math.random() * queue.length);
      } while (ni === index);
    } else {
      ni = index + 1;
      if (ni >= queue.length) {
        if (auto && repeat === "off") {
          set({ isPlaying: false, progress: 0 });
          return;
        }
        ni = 0;
      }
    }
    remember(queue[ni]);
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
    remember(queue[ni]);
    set({ index: ni, current: queue[ni], isPlaying: true, progress: 0 });
  },

  seek: (t) => set({ progress: t }),
  setVolume: (v) => set({ volume: v, muted: v === 0 }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
  setQueueOpen: (v) => set({ queueOpen: v }),
  _setProgress: (t) => set({ progress: t }),
  _setDuration: (d) => set({ duration: d }),
  _setIsPlaying: (v) => set({ isPlaying: v }),
  _setAmbient: (rgb) => set({ ambient: rgb }),
}));
