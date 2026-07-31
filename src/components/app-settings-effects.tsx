import { useEffect } from "react";
import { useSettings, useSettingsHydrated, ACCENTS } from "@/store/settings";
import { usePlayer } from "@/store/player";
import { useLibrary } from "@/store/library";
import { getTrack } from "@/lib/mock-library";
import { setupOfflineSupport, prefetchForOffline } from "@/lib/pwa";

/**
 * Applies theme + accent to <html>, wires the offline service worker, and
 * warms the artwork cache for whatever the listener opened last.
 */
export function AppSettingsEffects() {
  const hydrated = useSettingsHydrated();
  const theme = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const compactRows = useSettings((s) => s.compactRows);
  const offlineMode = useSettings((s) => s.offlineMode);
  const recent = useLibrary((s) => s.recent);
  const current = usePlayer((s) => s.current);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const prefersLight =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
        : theme === "light";
    root.classList.toggle("light", prefersLight);
    root.classList.toggle("dark", !prefersLight);
    root.dataset["accent"] = accent;
    root.dataset["motion"] = reducedMotion ? "reduced" : "full";
    root.dataset["density"] = compactRows ? "compact" : "cozy";

    const palette = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];
    root.style.setProperty("--accent-from", palette.from);
    root.style.setProperty("--accent-to", palette.to);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", prefersLight ? "#f4f2f8" : "#0a0a0f");
  }, [hydrated, theme, accent, reducedMotion, compactRows]);

  useEffect(() => {
    if (!hydrated) return;
    void setupOfflineSupport(offlineMode);
  }, [hydrated, offlineMode]);

  // Cache art for recently opened tracks so the library renders offline.
  useEffect(() => {
    if (!hydrated || !offlineMode) return;
    const covers = recent
      .map(getTrack)
      .map((t) => t?.cover)
      .filter((c): c is string => Boolean(c));
    if (current) covers.unshift(current.cover);
    void prefetchForOffline(covers);
  }, [hydrated, offlineMode, recent, current]);

  return null;
}
