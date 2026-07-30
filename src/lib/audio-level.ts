// Lightweight audio-reactive level bus. Kept outside React state so the
// analyser can run at animation rate without re-rendering the whole tree.
import { useEffect, useState } from "react";

type Level = { energy: number; bass: number; treble: number };

const level: Level = { energy: 0, bass: 0, treble: 0 };
const listeners = new Set<(l: Level) => void>();

export function setAudioLevel(next: Level) {
  level.energy = next.energy;
  level.bass = next.bass;
  level.treble = next.treble;
  listeners.forEach((fn) => fn(level));
}

export function getAudioLevel(): Level {
  return level;
}

/**
 * Subscribe to the analyser at a throttled rate (default ~12fps) so React
 * work stays cheap — especially on phones.
 */
export function useAudioLevel(fps = 12): Level {
  const [snapshot, setSnapshot] = useState<Level>({ ...level });

  useEffect(() => {
    let last = 0;
    const interval = 1000 / fps;
    const onLevel = (l: Level) => {
      const now = performance.now();
      if (now - last < interval) return;
      last = now;
      setSnapshot({ energy: l.energy, bass: l.bass, treble: l.treble });
    };
    listeners.add(onLevel);
    return () => {
      listeners.delete(onLevel);
    };
  }, [fps]);

  return snapshot;
}
