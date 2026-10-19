// src/lib/mock-library.ts
import {
  getAllLocalTracks,
  getImportedPlaylists,
  type StoredLocalTrack,
} from "@/lib/local-music-db";
import { useLibrary } from "@/store/library";
import { useSyncExternalStore } from "react";

import { type TrackSource, type TrackLicense, providerRegistry } from "@/lib/providers";

export type { TrackSource, TrackLicense };

export interface Track {
  id: string;
  source?: TrackSource;
  providerTrackId?: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  cover: string; // for backward compatibility
  artworkUrl?: string; // unified model field
  previewUrl?: string; // local or demo preview audio
  streamUrl?: string; // lazy in-memory stream URL; NEVER saved to persistent storage
  sourceUrl?: string; // direct URL to track page on provider
  license?: TrackLicense;
  attribution?: string;
  offline?: "available" | "none";
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  trackIds: string[];
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  year: number;
  cover: string;
  trackIds: string[];
}

export interface Artist {
  name: string;
  cover: string;
  trackIds: string[];
}

const art = (seed: string, size = 600) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;

export const demoTracks: Track[] = [
  {
    id: "t1",
    source: "jamendo",
    providerTrackId: "1214935",
    title: "Wish You Were Here",
    artist: "The.madpix.project",
    album: "Wish You Were Here",
    duration: 270,
    cover: "https://usercontent.jamendo.com?type=album&id=145774&width=300&trackid=1214935",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=145774&width=300&trackid=1214935",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1214935&format=mp31&from=PqkXGzZkJiG96au%2BNEs3vw%3D%3D%7CeDBR%2F7QZ%2F%2FqistceyuLVpA%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1214935",
    license: {
      name: "CC BY-NC-SA 3.0",
      url: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
    },
    attribution: "The.madpix.project via Jamendo (CC License)",
  },
  {
    id: "t2",
    source: "jamendo",
    providerTrackId: "1932670",
    title: "RED LIGHT",
    artist: "Egor Budennyy",
    album: "RED LIGHT",
    duration: 190,
    cover: "https://usercontent.jamendo.com?type=album&id=477294&width=300&trackid=1932670",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=477294&width=300&trackid=1932670",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1932670&format=mp31&from=HrQAOmElEJLdcuuF1JZuTg%3D%3D%7Cd7S80n9LB7N7%2BAacszCa1A%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1932670",
    license: {
      name: "CC BY-NC-ND 3.0",
      url: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
    },
    attribution: "Egor Budennyy via Jamendo (CC License)",
  },
  {
    id: "t3",
    source: "jamendo",
    providerTrackId: "1204669",
    title: "What Is Love",
    artist: "Melanie Ungar",
    album: "What Is Love",
    duration: 212,
    cover: "https://usercontent.jamendo.com?type=album&id=144705&width=300&trackid=1204669",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=144705&width=300&trackid=1204669",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1204669&format=mp31&from=P2qSH8dkjb940TDTe7UQUA%3D%3D%7CJLxm5cWyhppC4vztfD8NSQ%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1204669",
    license: {
      name: "CC BY 3.0",
      url: "http://creativecommons.org/licenses/by/3.0/",
    },
    attribution: "Melanie Ungar via Jamendo (CC License)",
  },
  {
    id: "t4",
    source: "jamendo",
    providerTrackId: "1141572",
    title: "Love Will Come Back Again",
    artist: "Chaz Robinson",
    album: "Chaz Robinson",
    duration: 236,
    cover: "https://usercontent.jamendo.com?type=album&id=136930&width=300&trackid=1141572",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=136930&width=300&trackid=1141572",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1141572&format=mp31&from=jkQic1o7ahIxpFacL9euwA%3D%3D%7C64JpqIvfXi2jwt28Wwle4A%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1141572",
    license: {
      name: "CC BY-SA 3.0",
      url: "http://creativecommons.org/licenses/by-sa/3.0/",
    },
    attribution: "Chaz Robinson via Jamendo (CC License)",
  },
  {
    id: "t5",
    source: "jamendo",
    providerTrackId: "1157362",
    title: "First",
    artist: "JekK",
    album: "Dear Dreams",
    duration: 204,
    cover: "https://usercontent.jamendo.com?type=album&id=138887&width=300&trackid=1157362",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=138887&width=300&trackid=1157362",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1157362&format=mp31&from=OJvXLqIKeeSx1o2UHkE4ZQ%3D%3D%7CeS5V5D34j3%2BkWA7DhlFQ4g%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1157362",
    license: {
      name: "CC BY-NC-ND 3.0",
      url: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
    },
    attribution: "JekK via Jamendo (CC License)",
  },
  {
    id: "t6",
    source: "jamendo",
    providerTrackId: "1161940",
    title: "In Tune (J. Glaze Remix)",
    artist: "Kellee Maize",
    album: "The Remixes (2015)",
    duration: 346,
    cover: "https://usercontent.jamendo.com?type=album&id=139585&width=300&trackid=1161940",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=139585&width=300&trackid=1161940",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1161940&format=mp31&from=Qkm4aOtaDYtLSExGCjO4rg%3D%3D%7CWwiw0qSs2nWenJzLO2H80A%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1161940",
    license: {
      name: "CC BY 3.0",
      url: "http://creativecommons.org/licenses/by/3.0/",
    },
    attribution: "Kellee Maize via Jamendo (CC License)",
  },
  {
    id: "t7",
    source: "jamendo",
    providerTrackId: "1129271",
    title: "Energy",
    artist: "Pokki DJ",
    album: "Energy",
    duration: 230,
    cover: "https://usercontent.jamendo.com?type=album&id=135310&width=300&trackid=1129271",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=135310&width=300&trackid=1129271",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1129271&format=mp31&from=ag%2B1afsLH%2F3c%2F0M6luLyJw%3D%3D%7CRqwuz9nQbSwcascVOB51vQ%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1129271",
    license: {
      name: "CC BY 3.0",
      url: "http://creativecommons.org/licenses/by/3.0/",
    },
    attribution: "Pokki DJ via Jamendo (CC License)",
  },
  {
    id: "t8",
    source: "jamendo",
    providerTrackId: "2034080",
    title: "Music Soothe - Meditation Music",
    artist: "StimiBeats",
    album: "Impression - Meditation Music",
    duration: 216,
    cover: "https://usercontent.jamendo.com?type=album&id=522038&width=300&trackid=2034080",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=522038&width=300&trackid=2034080",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=2034080&format=mp31&from=LaZyj0tL7nfYtZ1zZZsLow%3D%3D%7CvG0RTNNxGfprjvlXTkLd%2BA%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/2034080",
    license: {
      name: "CC BY-NC-ND 3.0",
      url: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
    },
    attribution: "StimiBeats via Jamendo (CC License)",
  },
  {
    id: "t9",
    source: "jamendo",
    providerTrackId: "1157358",
    title: "You and Me",
    artist: "JekK",
    album: "Dear Dreams",
    duration: 194,
    cover: "https://usercontent.jamendo.com?type=album&id=138887&width=300&trackid=1157358",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=138887&width=300&trackid=1157358",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1157358&format=mp31&from=ocaK9Su%2BJEMk83Y7fSXXsA%3D%3D%7CLDpt1dHzNMdz6d7imP2fhQ%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1157358",
    license: {
      name: "CC BY-NC-ND 3.0",
      url: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
    },
    attribution: "JekK via Jamendo (CC License)",
  },
  {
    id: "t10",
    source: "jamendo",
    providerTrackId: "1353511",
    title: "Survive",
    artist: "JekK",
    album: "Roses",
    duration: 163,
    cover: "https://usercontent.jamendo.com?type=album&id=159568&width=300&trackid=1353511",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=159568&width=300&trackid=1353511",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1353511&format=mp31&from=BaEYOCRHABKcuvp2VyPfMA%3D%3D%7CdGg0neMMzGgIg%2Bl9d4WALA%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1353511",
    license: {
      name: "CC BY-NC-ND 3.0",
      url: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
    },
    attribution: "JekK via Jamendo (CC License)",
  },
  {
    id: "t11",
    source: "jamendo",
    providerTrackId: "1165005",
    title: "Boys, Girls, Toys & Words",
    artist: "Modern Pitch",
    album: "Eye Of The Storm",
    duration: 357,
    cover: "https://usercontent.jamendo.com?type=album&id=140048&width=300&trackid=1165005",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=140048&width=300&trackid=1165005",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1165005&format=mp31&from=CzzJrqPsIg0KObg5KRTHGw%3D%3D%7CPiaKClPkUup5uqtPVdOQXQ%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1165005",
    license: {
      name: "CC BY-SA 3.0",
      url: "http://creativecommons.org/licenses/by-sa/3.0/",
    },
    attribution: "Modern Pitch via Jamendo (CC License)",
  },
  {
    id: "t12",
    source: "jamendo",
    providerTrackId: "1480482",
    title: "Crazy Glue",
    artist: "Melanie Ungar",
    album: "Crazy Glue",
    duration: 220,
    cover: "https://usercontent.jamendo.com?type=album&id=292101&width=300&trackid=1480482",
    artworkUrl: "https://usercontent.jamendo.com?type=album&id=292101&width=300&trackid=1480482",
    previewUrl:
      "https://prod-1.storage.jamendo.com/?trackid=1480482&format=mp31&from=S5kqsW4xNnSRujxW07j9aQ%3D%3D%7C8zuoReprCU26NL6GCnTLjg%3D%3D",
    sourceUrl: "https://www.jamendo.com/track/1480482",
    license: {
      name: "CC BY-NC-ND 3.0",
      url: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
    },
    attribution: "Melanie Ungar via Jamendo (CC License)",
  },
];

export const demoPlaylists: Playlist[] = [
  {
    id: "p1",
    name: "Global Top Hits",
    description: "The most listened to and trending music right now.",
    cover: "https://usercontent.jamendo.com?type=album&id=145774&width=300&trackid=1214935",
    trackIds: ["t1", "t2", "t3", "t4", "t7", "t11"],
  },
  {
    id: "p2",
    name: "Chill & Acoustic",
    description: "Laid-back vibes, acoustic melodies, and relaxing vocals.",
    cover: "https://usercontent.jamendo.com?type=album&id=138887&width=300&trackid=1157362",
    trackIds: ["t3", "t5", "t8", "t9", "t12"],
  },
  {
    id: "p3",
    name: "Deep Focus & Beats",
    description: "Atmospheric beats and electronic rhythms to get into the flow.",
    cover: "https://usercontent.jamendo.com?type=album&id=135310&width=300&trackid=1129271",
    trackIds: ["t6", "t7", "t8", "t10", "t2"],
  },
  {
    id: "p4",
    name: "Upbeat Pop & Dance",
    description: "High-energy tracks with driving basslines and infectious hooks.",
    cover: "https://usercontent.jamendo.com?type=album&id=477294&width=300&trackid=1932670",
    trackIds: ["t2", "t4", "t7", "t11", "t1"],
  },
  {
    id: "p5",
    name: "Liked Songs",
    description: "Your saved tracks and favorites.",
    cover: "https://usercontent.jamendo.com?type=album&id=136930&width=300&trackid=1141572",
    trackIds: ["t1", "t2", "t3", "t4", "t5", "t7", "t9"],
  },
];

// In-memory collections mutated in-place for synchronous access
export const tracks: Track[] = [...demoTracks];
export const playlists: Playlist[] = [...demoPlaylists];
export const recentlyPlayed: string[] = ["t1", "t2", "t3", "t4", "t5", "t6"];
export const albums: Album[] = [];
export const artists: Artist[] = [];

// Track whether user has imported local tracks
let isUserLibraryActive = false;
export function hasUserLibrary(): boolean {
  return isUserLibraryActive;
}

const albumYear: Record<string, number> = {
  "Wish You Were Here": 2020,
  "RED LIGHT": 2023,
  "What Is Love": 2021,
  "Chaz Robinson": 2019,
  "Dear Dreams": 2022,
  "The Remixes (2015)": 2015,
  Energy: 2021,
  "Impression - Meditation Music": 2024,
  Roses: 2023,
  "Eye Of The Storm": 2020,
  "Crazy Glue": 2022,
};

export const albumId = (name: string) =>
  (name || "album").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "local-album";

let catalogVersion = 0;
const catalogListeners = new Set<() => void>();

function notifyCatalogChanged() {
  catalogVersion++;
  for (const listener of catalogListeners) {
    listener();
  }
}

export function subscribeCatalog(listener: () => void): () => void {
  catalogListeners.add(listener);
  return () => catalogListeners.delete(listener);
}

export function getCatalogVersion(): number {
  return catalogVersion;
}

export function useCatalog() {
  useSyncExternalStore(subscribeCatalog, getCatalogVersion, getCatalogVersion);
  return {
    tracks,
    playlists,
    albums,
    artists,
    recentlyPlayed,
    hasUserLibrary: isUserLibraryActive,
  };
}

function rebuildDerivedCollections(localTracks: StoredLocalTrack[], importedPlaylists: Playlist[]) {
  isUserLibraryActive = localTracks.length > 0;

  tracks.length = 0;
  if (localTracks.length > 0) {
    // When local music exists, prioritize local music
    tracks.push(...localTracks);
  } else {
    tracks.push(...demoTracks);
  }

  playlists.length = 0;
  if (localTracks.length > 0) {
    playlists.push({
      id: "local-all",
      name: "All Local Tracks",
      description: `${localTracks.length} tracks indexed from your device · 100% Offline`,
      cover: localTracks[0].cover,
      trackIds: localTracks.map((t) => t.id),
    });
  }
  // Include imported playlists
  playlists.push(...importedPlaylists);
  if (localTracks.length === 0) {
    playlists.push(...demoPlaylists);
  }

  // Rebuild albums
  const activeTracks = tracks;
  const albumMap: Record<string, Album> = {};
  for (const t of activeTracks) {
    const id = albumId(t.album);
    if (!albumMap[id]) {
      albumMap[id] = {
        id,
        name: t.album,
        artist: t.artist,
        year: (t as StoredLocalTrack).year ?? albumYear[t.album] ?? 2025,
        cover: t.cover,
        trackIds: [],
      };
    }
    albumMap[id].trackIds.push(t.id);
  }
  albums.length = 0;
  albums.push(...Object.values(albumMap));

  // Rebuild artists
  const artistMap: Record<string, Artist> = {};
  for (const t of activeTracks) {
    if (!artistMap[t.artist]) {
      artistMap[t.artist] = { name: t.artist, cover: t.cover, trackIds: [] };
    }
    artistMap[t.artist].trackIds.push(t.id);
  }
  artists.length = 0;
  artists.push(...Object.values(artistMap));

  if (localTracks.length > 0) {
    recentlyPlayed.length = 0;
    recentlyPlayed.push(...localTracks.slice(0, 6).map((t) => t.id));
  }
}

// Initial initialization
rebuildDerivedCollections([], []);

export async function refreshCatalogFromIndexedDB(): Promise<{
  localTracks: StoredLocalTrack[];
  importedPlaylists: Playlist[];
}> {
  const [localTracks, importedPlaylists] = await Promise.all([
    getAllLocalTracks(),
    getImportedPlaylists(),
  ]);
  rebuildDerivedCollections(localTracks, importedPlaylists);
  notifyCatalogChanged();
  return { localTracks, importedPlaylists };
}

// Hydrate on client startup
if (typeof window !== "undefined") {
  void refreshCatalogFromIndexedDB();
}

export const getTrack = (id: string): Track | undefined => {
  return (
    tracks.find((t) => t.id === id) ||
    demoTracks.find((t) => t.id === id) ||
    (providerRegistry.getCachedTrackMetadata(id) as Track | undefined)
  );
};

export const isTrackAvailableOffline = (track: Track): boolean => {
  return track.source === "local" || track.offline === "available";
};

export const getPlaylist = (id: string): Playlist | undefined => {
  // Check mock/local playlists first
  const p = playlists.find((pl) => pl.id === id);
  if (p) return p;

  // Also check useLibrary state for user-created playlists!
  const userPlaylists = useLibrary.getState().playlists;
  const up = userPlaylists.find((pl) => pl.id === id);
  if (up) {
    return {
      id: up.id,
      name: up.name,
      description: up.description,
      cover: up.cover,
      trackIds: up.trackIds,
    };
  }

  return demoPlaylists.find((pl) => pl.id === id);
};

export const getPlaylistTracks = (id: string): Track[] => {
  const p = getPlaylist(id);
  if (!p) return [];
  return p.trackIds.map(getTrack).filter((t): t is Track => Boolean(t));
};

export const getAlbum = (id: string): Album | undefined => albums.find((a) => a.id === id);

export const getAlbumTracks = (id: string): Track[] =>
  getAlbum(id)
    ?.trackIds.map(getTrack)
    .filter((t): t is Track => Boolean(t)) ?? [];

export const tracksByIds = (ids: string[]): Track[] =>
  ids.map(getTrack).filter((t): t is Track => Boolean(t));

export const coverForSeed = (seed: string) => art(seed);
