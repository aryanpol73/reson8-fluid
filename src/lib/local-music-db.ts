// src/lib/local-music-db.ts
import type { Track, Playlist } from "@/lib/mock-library";
import * as mm from "music-metadata-browser";

export interface StoredLocalTrack extends Track {
  fileName: string;
  fileSize: number;
  mimeType: string;
  relativePath?: string;
  year?: number;
  trackNumber?: number;
  isLocal: true;
  addedAt: number;
  storageType?: "handle" | "blob";
  fileBlob?: Blob;
  fileHandle?: FileSystemFileHandle;
}

export interface ScanProgress {
  discovered: number;
  processed: number;
  currentFile: string;
  failed: number;
}

const DB_NAME = "reson8-local-db";
const DB_VERSION = 1;
const STORE_TRACKS = "local_tracks";
const STORE_PLAYLISTS = "imported_playlists";
const STORE_HANDLES = "dir_handles";

export const SUPPORTED_EXT = /\.(mp3|m4a|aac|flac|wav|ogg|opus|webm)$/i;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const store = db.createObjectStore(STORE_TRACKS, { keyPath: "id" });
        store.createIndex("by_title", "title", { unique: false });
        store.createIndex("by_artist", "artist", { unique: false });
        store.createIndex("by_album", "album", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

// Manage active Object URLs to prevent memory leaks
const activeObjectUrls = new Map<string, string>();

export function revokeTrackAudioUrl(trackId: string): void {
  const url = activeObjectUrls.get(trackId);
  if (url) {
    URL.revokeObjectURL(url);
    activeObjectUrls.delete(trackId);
  }
}

export function revokeAllTrackAudioUrls(): void {
  for (const url of activeObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  activeObjectUrls.clear();
}

export async function resolveTrackAudioUrl(
  track: Track & Partial<StoredLocalTrack>,
): Promise<string> {
  if (activeObjectUrls.has(track.id)) {
    return activeObjectUrls.get(track.id)!;
  }

  // If track already has a valid previewUrl that doesn't start with blob:
  if (track.previewUrl && !track.previewUrl.startsWith("blob:")) {
    return track.previewUrl;
  }

  try {
    const db = await openDB();
    const stored = await new Promise<StoredLocalTrack | undefined>((resolve) => {
      const tx = db.transaction(STORE_TRACKS, "readonly");
      const req = tx.objectStore(STORE_TRACKS).get(track.id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (stored?.fileHandle) {
      try {
        const handle = stored.fileHandle as FileSystemFileHandle & {
          queryPermission?: (opts: { mode: string }) => Promise<PermissionState>;
          requestPermission?: (opts: { mode: string }) => Promise<PermissionState>;
        };
        let perm: PermissionState = "granted";
        if (handle.queryPermission) {
          perm = await handle.queryPermission({ mode: "read" });
          if (perm === "prompt" && handle.requestPermission) {
            perm = await handle.requestPermission({ mode: "read" });
          }
        }
        if (perm === "granted") {
          const file = await handle.getFile();
          const url = URL.createObjectURL(file);
          activeObjectUrls.set(track.id, url);
          return url;
        }
      } catch {
        // Fall back to fileBlob if fileHandle fails
      }
    }

    if (stored?.fileBlob) {
      const url = URL.createObjectURL(stored.fileBlob);
      activeObjectUrls.set(track.id, url);
      return url;
    }
  } catch {
    // Return track.previewUrl if IndexedDB fails
  }

  return track.previewUrl || "";
}

export async function getAllLocalTracks(): Promise<StoredLocalTrack[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDB();
    return await new Promise<StoredLocalTrack[]>((resolve, reject) => {
      const tx = db.transaction(STORE_TRACKS, "readonly");
      const req = tx.objectStore(STORE_TRACKS).getAll();
      req.onsuccess = () => {
        const items = (req.result as StoredLocalTrack[]) || [];
        for (const item of items) {
          // Normalize legacy records
          if (!item.source) item.source = "local";
          if (!item.offline) item.offline = "available";
          if (!item.artworkUrl) item.artworkUrl = item.cover;

          if (item.fileBlob && !activeObjectUrls.has(item.id)) {
            const url = URL.createObjectURL(item.fileBlob);
            activeObjectUrls.set(item.id, url);
            item.previewUrl = url;
          } else if (activeObjectUrls.has(item.id)) {
            item.previewUrl = activeObjectUrls.get(item.id)!;
          }
        }
        resolve(items.sort((a, b) => b.addedAt - a.addedAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveLocalTracks(tracksToSave: StoredLocalTrack[]): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, "readwrite");
    const store = tx.objectStore(STORE_TRACKS);
    for (const t of tracksToSave) {
      store.put(t);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllLocalTracks(): Promise<void> {
  revokeAllTrackAudioUrls();
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_HANDLES], "readwrite");
    tx.objectStore(STORE_TRACKS).clear();
    tx.objectStore(STORE_HANDLES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveImportedPlaylist(playlist: Playlist): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, "readwrite");
    tx.objectStore(STORE_PLAYLISTS).put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImportedPlaylists(): Promise<Playlist[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDB();
    return await new Promise<Playlist[]>((resolve) => {
      const tx = db.transaction(STORE_PLAYLISTS, "readonly");
      const req = tx.objectStore(STORE_PLAYLISTS).getAll();
      req.onsuccess = () => resolve((req.result as Playlist[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteImportedPlaylist(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, "readwrite");
    tx.objectStore(STORE_PLAYLISTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Filename cleaner & fallback metadata
// ---------------------------------------------------------------------------

export function cleanFilenameToTrackInfo(filename: string): {
  artist: string;
  title: string;
  trackNumber?: number;
} {
  const withoutExt = filename.replace(/\.[^/.]+$/, "").trim();
  let trackNumber: number | undefined;
  const numMatch = withoutExt.match(/^(\d{1,3})\s*[-._)\s]\s*(.+)$/);
  const cleaned = numMatch ? numMatch[2] : withoutExt;
  if (numMatch) {
    trackNumber = parseInt(numMatch[1], 10);
  }

  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(" - ").trim(),
      trackNumber,
    };
  }
  return { artist: "Unknown Artist", title: cleaned, trackNumber };
}

export function generateDeterministicCover(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const palettes = [
    ["#00E5FF", "#3B82F6", "#050B1A"],
    ["#3B82F6", "#7C3AED", "#030712"],
    ["#7C3AED", "#EC0CFF", "#071127"],
    ["#00E5FF", "#A855F7", "#050B1A"],
  ];
  const [c1, c2, bg] = palettes[Math.abs(hash) % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.85"/>
        <stop offset="55%" stop-color="${c2}" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="${bg}"/>
    <circle cx="300" cy="300" r="240" fill="url(#g)" opacity="0.75"/>
    <circle cx="300" cy="300" r="140" fill="none" stroke="${c1}" stroke-opacity="0.35" stroke-width="2"/>
    <circle cx="300" cy="300" r="36" fill="${bg}" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function readAudioDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(210);
      return;
    }
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    let settled = false;
    const cleanup = (dur: number) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute("src");
      resolve(Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 210);
    };
    const timer = window.setTimeout(() => cleanup(210), 3000);
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      cleanup(audio.duration);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      cleanup(210);
    };
    audio.src = objectUrl;
  });
}

export interface ExtractedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  trackNumber?: number;
  duration?: number;
  cover?: string;
}

export async function parseAudioMetadata(file: File): Promise<ExtractedMetadata> {
  const fallback = cleanFilenameToTrackInfo(file.name);
  try {
    const metadata = await mm.parseBlob(file, { duration: true, skipCovers: false });
    const { common, format } = metadata;

    let cover: string | undefined;
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      if (pic.data && pic.data.byteLength < 2_000_000) {
        let binary = "";
        const bytes = pic.data instanceof Uint8Array ? pic.data : new Uint8Array(pic.data);
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        cover = `data:${pic.format || "image/jpeg"};base64,${btoa(binary)}`;
      }
    }

    return {
      title: common.title?.trim() || fallback.title,
      artist: common.artist?.trim() || common.albumartist?.trim() || fallback.artist,
      album: common.album?.trim(),
      year: common.year,
      trackNumber: common.track?.no ?? fallback.trackNumber,
      duration: format.duration ? Math.round(format.duration) : undefined,
      cover,
    };
  } catch {
    return {
      title: fallback.title,
      artist: fallback.artist,
      trackNumber: fallback.trackNumber,
    };
  }
}

export async function processAudioFiles(
  entries: { file: File; handle?: FileSystemFileHandle; relativePath?: string }[],
  onProgress?: (progress: ScanProgress) => void,
  signal?: AbortSignal,
): Promise<StoredLocalTrack[]> {
  const validEntries = entries.filter(
    ({ file }) => SUPPORTED_EXT.test(file.name) || file.type.startsWith("audio/"),
  );

  const results: StoredLocalTrack[] = [];
  let failed = 0;

  for (let i = 0; i < validEntries.length; i++) {
    if (signal?.aborted) break;
    const { file, handle, relativePath } = validEntries[i];

    onProgress?.({
      discovered: validEntries.length,
      processed: i,
      currentFile: file.name,
      failed,
    });

    try {
      const meta = await parseAudioMetadata(file);

      const pathParts = (relativePath || file.webkitRelativePath || "").split("/").filter(Boolean);
      const folderAlbum = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : undefined;

      const title = meta.title || file.name;
      const artist = meta.artist || "Unknown Artist";
      const album = meta.album || folderAlbum || "Local Library";

      const id = `local-${`${artist}-${album}-${title}-${file.size}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 80)}`;

      const objectUrl = URL.createObjectURL(file);
      activeObjectUrls.set(id, objectUrl);

      const duration = meta.duration || (await readAudioDuration(objectUrl));
      const cover = meta.cover || generateDeterministicCover(`${artist}-${album}-${title}`);

      const trackRecord: StoredLocalTrack = {
        id,
        source: "local",
        title,
        artist,
        album,
        duration,
        cover,
        artworkUrl: cover,
        previewUrl: objectUrl,
        offline: "available",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "audio/mpeg",
        relativePath: relativePath || file.webkitRelativePath || file.name,
        year: meta.year,
        trackNumber: meta.trackNumber,
        isLocal: true,
        addedAt: Date.now() + i,
        storageType: handle ? "handle" : "blob",
        // Avoid storing fileBlob in IndexedDB if we have a persistent FileSystemFileHandle
        ...(handle ? { fileHandle: handle } : { fileBlob: file }),
      };

      results.push(trackRecord);
    } catch {
      failed++;
    }
  }

  onProgress?.({
    discovered: validEntries.length,
    processed: validEntries.length,
    currentFile: "Complete",
    failed,
  });

  if (results.length > 0) {
    await saveLocalTracks(results);
  }

  return results;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickAndScanDirectory(
  onProgress?: (progress: ScanProgress) => void,
  signal?: AbortSignal,
): Promise<StoredLocalTrack[]> {
  const windowWithPicker = window as unknown as {
    showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
  };
  const dirHandle = await windowWithPicker.showDirectoryPicker({ mode: "read" });

  const discovered: { file: File; handle: FileSystemFileHandle; relativePath: string }[] = [];

  async function walk(handle: FileSystemDirectoryHandle, prefix = "") {
    if (signal?.aborted) return;
    const asyncIterator = (
      handle as unknown as {
        values: () => AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>;
      }
    ).values();

    for await (const entry of asyncIterator) {
      if (signal?.aborted) return;
      if (entry.kind === "file") {
        if (SUPPORTED_EXT.test(entry.name)) {
          try {
            const file = await entry.getFile();
            discovered.push({
              file,
              handle: entry as FileSystemFileHandle,
              relativePath: prefix ? `${prefix}/${entry.name}` : entry.name,
            });
            onProgress?.({
              discovered: discovered.length,
              processed: 0,
              currentFile: `Scanning ${entry.name}...`,
              failed: 0,
            });
          } catch {
            // Skip unreadable file
          }
        }
      } else if (entry.kind === "directory" && !entry.name.startsWith(".")) {
        await walk(
          entry as FileSystemDirectoryHandle,
          prefix ? `${prefix}/${entry.name}` : entry.name,
        );
      }
    }
  }

  await walk(dirHandle);
  return processAudioFiles(discovered, onProgress, signal);
}
