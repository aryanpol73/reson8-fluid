import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";
export type Accent = "aurora" | "magenta" | "cyan" | "sunset" | "mint";

export const ACCENTS: { id: Accent; label: string; from: string; to: string }[] = [
  { id: "aurora", label: "Aurora", from: "#b46bff", to: "#4fe3ea" },
  { id: "magenta", label: "Magenta", from: "#ff4fd8", to: "#ff8a4f" },
  { id: "cyan", label: "Cyan", from: "#4fe3ea", to: "#4f8dff" },
  { id: "sunset", label: "Sunset", from: "#ff8a4f", to: "#ffd24f" },
  { id: "mint", label: "Mint", from: "#4fffb0", to: "#4fe3ea" },
];

interface SettingsState {
  theme: ThemeMode;
  accent: Accent;
  ambientIntensity: number; // 0..1 background strength
  audioReactive: boolean;
  reducedMotion: boolean;
  offlineMode: boolean;
  autoplaySimilar: boolean;
  crossfade: number; // seconds, 0 = off
  normalizeVolume: boolean;
  showEqualizer: boolean;
  compactRows: boolean;
  dataSaver: boolean;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
}

const defaults = {
  theme: "dark" as ThemeMode,
  accent: "aurora" as Accent,
  ambientIntensity: 0.85,
  audioReactive: true,
  reducedMotion: false,
  offlineMode: true,
  autoplaySimilar: true,
  crossfade: 0,
  normalizeVolume: true,
  showEqualizer: true,
  compactRows: false,
  dataSaver: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      reset: () => set({ ...defaults }),
    }),
    {
      name: "reson8-settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export function useSettingsHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useSettings.persist.rehydrate();
    setHydrated(true);
  }, []);
  return hydrated;
}
