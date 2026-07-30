// Mock library. `previewUrl` is a real, playable 30-60s clip so the audio engine
// works today. Album art uses picsum (CORS-enabled) so fast-average-color can
// extract dominant colors at runtime.
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  cover: string;
  previewUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  trackIds: string[];
}

const audio = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const art = (seed: string, size = 600) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;

export const tracks: Track[] = [
  { id: "t1", title: "Neon Bloom", artist: "Aria Vale", album: "Chromatic", duration: 218, cover: art("neonbloom"), previewUrl: audio(1) },
  { id: "t2", title: "Velvet Hours", artist: "Kite & Cloud", album: "Slow Weather", duration: 244, cover: art("velvet"), previewUrl: audio(2) },
  { id: "t3", title: "Paper Skies", artist: "Mono North", album: "Cartography", duration: 197, cover: art("paperskies"), previewUrl: audio(3) },
  { id: "t4", title: "Glass Ocean", artist: "Lumen", album: "Refraction", duration: 262, cover: art("glassocean"), previewUrl: audio(4) },
  { id: "t5", title: "Midnight Loop", artist: "Sable Sun", album: "After Hours", duration: 231, cover: art("midnightloop"), previewUrl: audio(5) },
  { id: "t6", title: "Amber Static", artist: "Halo Fields", album: "Signal", duration: 205, cover: art("amberstatic"), previewUrl: audio(6) },
  { id: "t7", title: "Pale Currents", artist: "Isla Moon", album: "Tidewater", duration: 289, cover: art("palecurrents"), previewUrl: audio(7) },
  { id: "t8", title: "Slow Rotation", artist: "Verre", album: "Orbit", duration: 254, cover: art("slowrotation"), previewUrl: audio(8) },
  { id: "t9", title: "Ceramic Heart", artist: "Nova Fair", album: "Kiln", duration: 213, cover: art("ceramicheart"), previewUrl: audio(9) },
  { id: "t10", title: "Ultraviolet", artist: "Aria Vale", album: "Chromatic", duration: 238, cover: art("ultraviolet"), previewUrl: audio(10) },
  { id: "t11", title: "Small Machines", artist: "Kite & Cloud", album: "Slow Weather", duration: 226, cover: art("smallmachines"), previewUrl: audio(11) },
  { id: "t12", title: "Marble Sunrise", artist: "Lumen", album: "Refraction", duration: 271, cover: art("marblesunrise"), previewUrl: audio(12) },
];

export const playlists: Playlist[] = [
  {
    id: "p1",
    name: "Daily Mix",
    description: "A shifting blend tuned to your recent listening.",
    cover: art("dailymix"),
    trackIds: ["t1", "t4", "t7", "t10", "t2", "t11"],
  },
  {
    id: "p2",
    name: "Late Night",
    description: "Slow textures for the last hour of the day.",
    cover: art("latenight"),
    trackIds: ["t5", "t8", "t12", "t3", "t7"],
  },
  {
    id: "p3",
    name: "Focus Field",
    description: "Instrumental warmth for deep work.",
    cover: art("focusfield"),
    trackIds: ["t3", "t6", "t9", "t11", "t4"],
  },
  {
    id: "p4",
    name: "Sunrise Drive",
    description: "Bright, moving, forward-leaning.",
    cover: art("sunrisedrive"),
    trackIds: ["t1", "t10", "t6", "t12", "t8"],
  },
  {
    id: "p5",
    name: "Liked Songs",
    description: "Everything you've saved.",
    cover: art("likedsongs"),
    trackIds: ["t2", "t5", "t9", "t1", "t7", "t4", "t11"],
  },
];

export const recentlyPlayed: string[] = ["t4", "t1", "t7", "t10", "t2", "t8"];

export const getTrack = (id: string) => tracks.find((t) => t.id === id);
export const getPlaylist = (id: string) => playlists.find((p) => p.id === id);
export const getPlaylistTracks = (id: string): Track[] => {
  const p = getPlaylist(id);
  if (!p) return [];
  return p.trackIds.map(getTrack).filter((t): t is Track => Boolean(t));
};

// ---------------------------------------------------------------------------
// Albums are derived from the track list so metadata stays in one place.
export interface Album {
  id: string;
  name: string;
  artist: string;
  year: number;
  cover: string;
  trackIds: string[];
}

const albumYear: Record<string, number> = {
  Chromatic: 2024,
  "Slow Weather": 2023,
  Cartography: 2025,
  Refraction: 2024,
  "After Hours": 2022,
  Signal: 2023,
  Tidewater: 2025,
  Orbit: 2021,
  Kiln: 2024,
};

export const albumId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const albums: Album[] = Object.values(
  tracks.reduce<Record<string, Album>>((acc, t) => {
    const id = albumId(t.album);
    if (!acc[id]) {
      acc[id] = {
        id,
        name: t.album,
        artist: t.artist,
        year: albumYear[t.album] ?? 2024,
        cover: t.cover,
        trackIds: [],
      };
    }
    acc[id].trackIds.push(t.id);
    return acc;
  }, {}),
);

export const getAlbum = (id: string) => albums.find((a) => a.id === id);
export const getAlbumTracks = (id: string): Track[] =>
  getAlbum(id)?.trackIds.map(getTrack).filter((t): t is Track => Boolean(t)) ?? [];

export interface Artist {
  name: string;
  cover: string;
  trackIds: string[];
}

export const artists: Artist[] = Object.values(
  tracks.reduce<Record<string, Artist>>((acc, t) => {
    if (!acc[t.artist]) acc[t.artist] = { name: t.artist, cover: t.cover, trackIds: [] };
    acc[t.artist].trackIds.push(t.id);
    return acc;
  }, {}),
);

export const tracksByIds = (ids: string[]): Track[] =>
  ids.map(getTrack).filter((t): t is Track => Boolean(t));

export const coverForSeed = (seed: string) => art(seed);
