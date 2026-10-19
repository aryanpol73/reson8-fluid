// src/lib/spotify-matcher.ts
import type { Track, Playlist } from "@/lib/mock-library";
import type { StoredLocalTrack } from "@/lib/local-music-db";

export interface ImportedSpotifyTrack {
  spotifyId?: string;
  title: string;
  artist: string;
  album: string;
  durationSec?: number;
  orderIndex: number;
}

export interface ImportedSpotifyPlaylist {
  name: string;
  description: string;
  tracks: ImportedSpotifyTrack[];
}

export type MatchStatus = "matched" | "needs_review" | "missing";

export interface TrackMatchResult {
  imported: ImportedSpotifyTrack;
  candidate: (Track & Partial<StoredLocalTrack>) | null;
  alternatives: { track: Track & Partial<StoredLocalTrack>; score: number }[];
  score: number; // 0 - 100
  status: MatchStatus;
  reasons: string[];
}

export interface PlaylistMatchSummary {
  playlistId: string;
  playlistName: string;
  description: string;
  results: TrackMatchResult[];
  matchedCount: number;
  reviewCount: number;
  missingCount: number;
}

// ---------------------------------------------------------------------------
// Normalization & String Similarity
// ---------------------------------------------------------------------------

export const VERSION_TAGS = [
  "live",
  "acoustic",
  "remix",
  "instrumental",
  "karaoke",
  "demo",
  "sped up",
  "slowed",
  "reverb",
  "orchestral",
  "radio edit",
];

export function normalizeText(raw: string, stripRemaster = true): string {
  let s = (raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Strip featuring artists from title (feat. / ft. / with)
  s = s.replace(/\b(feat|ft|featuring|with)\.?\s+[^-()[\]]+/gi, " ");

  if (stripRemaster) {
    // Strip "- 2011 Remaster", "(Remastered 2020)", "[Deluxe Edition]", "(Official Audio)", etc.
    s = s.replace(/[-–—]\s*(\d{4}\s*)?remaster(ed)?(\s*\d{4})?\b.*/gi, " ");
    s = s.replace(
      /[([][^)\]]*(remaster|deluxe|anniversary|edition|bonus|explicit|clean|official|video|audio)[^)\]]*[)\]]/gi,
      " ",
    );
  }

  // Normalize punctuation and apostrophes
  s = s
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

export function extractVersionMarkers(raw: string): string[] {
  const lower = (raw || "").toLowerCase();
  return VERSION_TAGS.filter((tag) => new RegExp(`\\b${tag}\\b`, "i").test(lower));
}

export function diceBigrams(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigramsA.get(bg) ?? 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      intersection++;
    }
  }

  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

export function stringSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return Math.max(0.85, ratio);
  }
  return diceBigrams(na, nb);
}

// ---------------------------------------------------------------------------
// Multi-factor Weighted Scoring Engine
// ---------------------------------------------------------------------------

export function scoreTrackCandidate(
  imported: ImportedSpotifyTrack,
  local: Track & Partial<StoredLocalTrack>,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const titleSim = stringSimilarity(imported.title, local.title);
  if (titleSim >= 0.95) reasons.push("Exact title");
  else if (titleSim >= 0.75) reasons.push("Similar title");

  // Artist comparison: also check primary artist before comma/slash/semicolon
  const impPrimaryArtist = imported.artist.split(/[,;/]/)[0]?.trim() || imported.artist;
  const locPrimaryArtist = local.artist.split(/[,;/]/)[0]?.trim() || local.artist;
  const artistSim = Math.max(
    stringSimilarity(imported.artist, local.artist),
    stringSimilarity(impPrimaryArtist, locPrimaryArtist),
  );
  if (artistSim >= 0.88) reasons.push("Artist match");

  const albumSim =
    imported.album && local.album && local.album !== "Local Library"
      ? stringSimilarity(imported.album, local.album)
      : 0.7;

  let durationSim = 0.8;
  if (imported.durationSec && local.duration) {
    const diff = Math.abs(imported.durationSec - local.duration);
    if (diff <= 3) {
      durationSim = 1;
      reasons.push("Exact duration");
    } else if (diff <= 10) {
      durationSim = 0.75;
    } else if (diff <= 25) {
      durationSim = 0.4;
    } else {
      durationSim = 0.1;
    }
  }

  const fileTarget = local.fileName || `${local.artist} - ${local.title}`;
  const filenameSim = Math.max(
    stringSimilarity(`${imported.artist} ${imported.title}`, fileTarget),
    stringSimilarity(imported.title, fileTarget),
  );
  if (filenameSim >= 0.85 && titleSim < 0.85) {
    reasons.push("Filename match");
  }

  let rawScore =
    titleSim * 50 + artistSim * 25 + albumSim * 10 + durationSim * 5 + filenameSim * 10;

  // Penalize version mismatches (e.g., Studio vs Live / Acoustic / Remix)
  const impVersions = extractVersionMarkers(imported.title);
  const locVersions = extractVersionMarkers(`${local.title} ${local.fileName ?? ""}`);
  if (impVersions.join(",") !== locVersions.join(",")) {
    rawScore -= 18;
    reasons.push("Version mismatch");
  }

  // Boost when both normalized Title and Primary Artist match strongly
  if (titleSim >= 0.92 && artistSim >= 0.85 && impVersions.join(",") === locVersions.join(",")) {
    rawScore = Math.max(rawScore, 95);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  return { score: finalScore, reasons };
}

export function matchPlaylistToLibrary(
  playlist: ImportedSpotifyPlaylist,
  catalog: (Track & Partial<StoredLocalTrack>)[],
  autoThreshold = 85,
  reviewThreshold = 65,
): PlaylistMatchSummary {
  const results: TrackMatchResult[] = playlist.tracks.map((imp) => {
    const scored = catalog
      .map((candidate) => {
        const { score, reasons } = scoreTrackCandidate(imp, candidate);
        return { track: candidate, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(0, 5).filter((s) => s.score >= 40);

    if (!best || best.score < reviewThreshold) {
      return {
        imported: imp,
        candidate: best && best.score >= 40 ? best.track : null,
        alternatives,
        score: best?.score ?? 0,
        status: "missing",
        reasons: best?.reasons ?? ["No local match found"],
      };
    }

    const status: MatchStatus = best.score >= autoThreshold ? "matched" : "needs_review";
    return {
      imported: imp,
      candidate: best.track,
      alternatives,
      score: best.score,
      status,
      reasons: best.reasons,
    };
  });

  return {
    playlistId: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playlistName: playlist.name,
    description: playlist.description,
    results,
    matchedCount: results.filter((r) => r.status === "matched").length,
    reviewCount: results.filter((r) => r.status === "needs_review").length,
    missingCount: results.filter((r) => r.status === "missing").length,
  };
}

// ---------------------------------------------------------------------------
// Robust CSV & JSON Parsers
// ---------------------------------------------------------------------------

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field.trim());
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        if (ch === "\r") i++;
        current.push(field.trim());
        if (current.some((cell) => cell.length > 0)) rows.push(current);
        current = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim());
    if (current.some((cell) => cell.length > 0)) rows.push(current);
  }
  return rows;
}

export function parseSpotifyExportFile(
  content: string,
  fileName: string,
): ImportedSpotifyPlaylist[] {
  const baseName =
    fileName
      .replace(/\.(json|csv)$/i, "")
      .replace(/[_-]+/g, " ")
      .trim() || "Imported Playlist";

  // Check if content is JSON
  if (fileName.toLowerCase().endsWith(".json") || /^[\s]*[{[]/.test(content)) {
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (e) {
      throw new Error(`Malformed JSON file: ${(e as Error).message}`);
    }

    // Format 1: Spotify Privacy Account Export (`{ playlists: [ { name, items: [...] } ] }`)
    if (
      data &&
      typeof data === "object" &&
      Array.isArray((data as { playlists?: unknown[] }).playlists)
    ) {
      const exportData = data as { playlists: Record<string, unknown>[] };
      return exportData.playlists.map((pl, idx) => {
        const rawItems = (pl.items || pl.tracks || []) as Record<string, unknown>[];
        const tracks: ImportedSpotifyTrack[] = rawItems
          .map((item, i) => {
            const trk = (item.track || item) as Record<string, unknown>;
            const title = String(trk.trackName || trk.name || trk.title || "").trim();
            const artist = String(
              trk.artistName ||
                trk.artist ||
                (Array.isArray(trk.artists)
                  ? trk.artists.map((a: { name?: string }) => a.name).join(", ")
                  : ""),
            ).trim();
            const album = String(
              trk.albumName ||
                (typeof trk.album === "object" && trk.album !== null
                  ? (trk.album as { name?: string }).name
                  : trk.album) ||
                "",
            ).trim();
            const ms = Number(trk.duration_ms || trk.msPlayed || 0);
            return {
              spotifyId: String(trk.trackUri || trk.uri || trk.id || `sp-${i}`),
              title,
              artist: artist || "Unknown Artist",
              album: album || "Unknown Album",
              durationSec: ms > 0 ? Math.round(ms / 1000) : undefined,
              orderIndex: i,
            };
          })
          .filter((t) => Boolean(t.title));

        return {
          name: String(pl.name || `${baseName} #${idx + 1}`),
          description: String(pl.description || "Imported from Spotify JSON"),
          tracks,
        };
      });
    }

    // Format 2: Spotify Web API Playlist Object or direct Array of Tracks
    const rootObj = data as Record<string, unknown>;
    const rawTracks: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : Array.isArray((rootObj.tracks as { items?: unknown[] })?.items)
        ? (rootObj.tracks as { items: Record<string, unknown>[] }).items
        : Array.isArray(rootObj.items)
          ? (rootObj.items as Record<string, unknown>[])
          : [];

    const tracks: ImportedSpotifyTrack[] = rawTracks
      .map((item, i) => {
        const t = ((item as { track?: unknown }).track || item) as Record<string, unknown>;
        const title = String(t.name || t.trackName || t.title || "").trim();
        const artist = Array.isArray(t.artists)
          ? t.artists
              .map((a: { name?: string }) => a.name)
              .filter(Boolean)
              .join(", ")
          : String(t.artistName || t.artist || "Unknown Artist");
        const album =
          typeof t.album === "object" && t.album !== null
            ? String((t.album as { name?: string }).name || "")
            : String(t.albumName || t.album || "");
        const ms = Number(t.duration_ms || 0);
        return {
          spotifyId: String(t.id || t.uri || `sp-${i}`),
          title,
          artist,
          album,
          durationSec: ms > 0 ? Math.round(ms / 1000) : undefined,
          orderIndex: i,
        };
      })
      .filter((t) => Boolean(t.title));

    return [
      {
        name: String(rootObj.name || baseName),
        description: String(rootObj.description || "Imported from Spotify JSON"),
        tracks,
      },
    ];
  }

  // Format 3: Exportify / Spotify CSV
  const rows = parseCsvRows(content);
  if (rows.length < 2) {
    throw new Error("CSV file contains no track rows.");
  }

  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const findCol = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const titleCol = findCol(["trackname", "title", "name", "song"]);
  const artistCol = findCol(["artistname", "artists", "artist"]);
  const albumCol = findCol(["albumname", "album"]);
  const durCol = findCol(["durationms", "duration", "length"]);
  const uriCol = findCol(["trackuri", "spotifyuri", "uri", "trackid"]);

  if (titleCol === -1) {
    throw new Error("Could not find a 'Track Name' or 'Title' column in the CSV.");
  }

  const tracks: ImportedSpotifyTrack[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = row[titleCol]?.trim();
    if (!title) continue;
    const artist =
      (artistCol >= 0 ? row[artistCol] : "")?.replace(/;/g, ", ").trim() || "Unknown Artist";
    const album = (albumCol >= 0 ? row[albumCol] : "")?.trim() || "Unknown Album";
    const rawDur = durCol >= 0 ? Number(row[durCol]) : 0;
    const durationSec =
      rawDur > 1000 ? Math.round(rawDur / 1000) : rawDur > 0 ? Math.round(rawDur) : undefined;

    tracks.push({
      spotifyId: uriCol >= 0 ? row[uriCol] : `csv-${r}`,
      title,
      artist,
      album,
      durationSec,
      orderIndex: r - 1,
    });
  }

  return [
    {
      name: baseName,
      description: `Imported from ${fileName} (${tracks.length} tracks)`,
      tracks,
    },
  ];
}
