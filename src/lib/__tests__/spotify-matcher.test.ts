// src/lib/__tests__/spotify-matcher.test.ts
import { describe, it, expect } from "vitest";
import {
  normalizeText,
  extractVersionMarkers,
  stringSimilarity,
  scoreTrackCandidate,
  parseCsvRows,
  parseSpotifyExportFile,
  matchPlaylistToLibrary,
  type ImportedSpotifyTrack,
  type ImportedSpotifyPlaylist,
} from "../spotify-matcher";
import type { Track } from "../mock-library";

describe("Spotify Matcher - Normalization", () => {
  it("normalizes diacritics and accents", () => {
    expect(normalizeText("Beyoncé")).toBe("beyonce");
    expect(normalizeText("Sigur Rós")).toBe("sigur ros");
    expect(normalizeText("Björk")).toBe("bjork");
  });

  it("strips remaster and deluxe tags when requested", () => {
    expect(normalizeText("Starman - 2012 Remaster")).toBe("starman");
    expect(normalizeText("Time (Remastered 2021)")).toBe("time");
    expect(normalizeText("Dreams [Deluxe Edition]")).toBe("dreams");
    expect(normalizeText("Paranoid - 2016 Remastered Version")).toBe("paranoid");
  });

  it("strips featuring artists from track title", () => {
    expect(normalizeText("Levitating (feat. DaBaby)")).toBe("levitating");
    expect(normalizeText("Cold Heart ft. Dua Lipa")).toBe("cold heart");
    expect(normalizeText("Empire State of Mind featuring Alicia Keys")).toBe(
      "empire state of mind",
    );
  });

  it("normalizes punctuation and ampersands", () => {
    expect(normalizeText("Rock & Roll")).toBe("rock and roll");
    expect(normalizeText("Don't Stop Believin'")).toBe("dont stop believin");
  });

  it("extracts version markers correctly", () => {
    expect(extractVersionMarkers("Hotel California - Live")).toContain("live");
    expect(extractVersionMarkers("Everlong (Acoustic Version)")).toContain("acoustic");
    expect(extractVersionMarkers("Bad Guy - Remix")).toContain("remix");
    expect(extractVersionMarkers("Clair de Lune (Instrumental)")).toContain("instrumental");
    expect(extractVersionMarkers("Yellow - Studio Version")).toEqual([]);
  });
});

describe("Spotify Matcher - String Similarity", () => {
  it("returns 1 for exact identical strings", () => {
    expect(stringSimilarity("Bohemian Rhapsody", "Bohemian Rhapsody")).toBe(1);
  });

  it("returns high score for case and punctuation variations", () => {
    const sim = stringSimilarity("Don't Stop Me Now", "Dont Stop Me Now");
    expect(sim).toBe(1);
  });

  it("handles substrings cleanly", () => {
    const sim = stringSimilarity("Come As You Are", "Come As You Are (Live)");
    expect(sim).toBeGreaterThanOrEqual(0.7);
  });

  it("returns low score for unrelated titles", () => {
    expect(stringSimilarity("Yesterday", "Tomorrow Never Dies")).toBeLessThan(0.3);
  });
});

describe("Spotify Matcher - Weighted Scoring", () => {
  const localCatalog: Track[] = [
    {
      id: "loc-1",
      title: "Bohemian Rhapsody",
      artist: "Queen",
      album: "A Night at the Opera",
      duration: 354,
      cover: "",
      previewUrl: "",
    },
    {
      id: "loc-2",
      title: "Hotel California - Live On MTV",
      artist: "Eagles",
      album: "Hell Freezes Over",
      duration: 432,
      cover: "",
      previewUrl: "",
    },
    {
      id: "loc-3",
      title: "Hotel California",
      artist: "Eagles",
      album: "Hotel California",
      duration: 391,
      cover: "",
      previewUrl: "",
    },
  ];

  it("scores exact matches above 90%", () => {
    const imp: ImportedSpotifyTrack = {
      title: "Bohemian Rhapsody",
      artist: "Queen",
      album: "A Night at the Opera",
      durationSec: 354,
      orderIndex: 0,
    };
    const { score, reasons } = scoreTrackCandidate(imp, localCatalog[0]);
    expect(score).toBeGreaterThanOrEqual(92);
    expect(reasons).toContain("Exact title");
    expect(reasons).toContain("Artist match");
  });

  it("penalizes live vs studio version mismatch", () => {
    const studioImp: ImportedSpotifyTrack = {
      title: "Hotel California",
      artist: "Eagles",
      album: "Hotel California",
      durationSec: 390,
      orderIndex: 0,
    };
    const liveScore = scoreTrackCandidate(studioImp, localCatalog[1]).score;
    const studioScore = scoreTrackCandidate(studioImp, localCatalog[2]).score;
    expect(studioScore).toBeGreaterThan(liveScore);
  });
});

describe("Spotify Matcher - CSV Parsing", () => {
  it("parses CSV rows with quoted fields and commas inside quotes", () => {
    const csv = `Track Name,Artist Name(s),Album Name,Duration (ms)\n"Hello, Goodbye","The Beatles","Magical Mystery Tour",208000\n"Yesterday","The Beatles","Help!",125000`;
    const rows = parseCsvRows(csv);
    expect(rows.length).toBe(3);
    expect(rows[1][0]).toBe("Hello, Goodbye");
    expect(rows[1][1]).toBe("The Beatles");
  });

  it("parses Spotify/Exportify CSV content into ImportedSpotifyPlaylist", () => {
    const csv = `Track Name,Artist Name(s),Album Name,Duration (ms),Track URI\n"Karma Police","Radiohead","OK Computer",264000,"spotify:track:abc123"`;
    const playlists = parseSpotifyExportFile(csv, "90s_Alt_Rock.csv");
    expect(playlists.length).toBe(1);
    expect(playlists[0].name).toBe("90s Alt Rock");
    expect(playlists[0].tracks.length).toBe(1);
    expect(playlists[0].tracks[0].title).toBe("Karma Police");
    expect(playlists[0].tracks[0].artist).toBe("Radiohead");
    expect(playlists[0].tracks[0].durationSec).toBe(264);
  });
});

describe("Spotify Matcher - JSON Parsing", () => {
  it("parses Spotify Privacy Account export JSON format", () => {
    const privacyJson = JSON.stringify({
      playlists: [
        {
          name: "My Chill Mix",
          items: [
            {
              track: {
                trackName: "Weightless",
                artistName: "Marconi Union",
                albumName: "Weightless",
                duration_ms: 485000,
                trackUri: "spotify:track:xyz",
              },
            },
          ],
        },
      ],
    });

    const playlists = parseSpotifyExportFile(privacyJson, "Playlist1.json");
    expect(playlists.length).toBe(1);
    expect(playlists[0].name).toBe("My Chill Mix");
    expect(playlists[0].tracks[0].title).toBe("Weightless");
    expect(playlists[0].tracks[0].artist).toBe("Marconi Union");
  });

  it("parses Spotify Web API JSON format", () => {
    const apiJson = JSON.stringify({
      name: "Roadtrip Vibes",
      tracks: {
        items: [
          {
            track: {
              id: "t-1",
              name: "Fast Car",
              artists: [{ name: "Tracy Chapman" }],
              album: { name: "Tracy Chapman" },
              duration_ms: 296000,
            },
          },
        ],
      },
    });

    const playlists = parseSpotifyExportFile(apiJson, "roadtrip.json");
    expect(playlists.length).toBe(1);
    expect(playlists[0].name).toBe("Roadtrip Vibes");
    expect(playlists[0].tracks[0].title).toBe("Fast Car");
    expect(playlists[0].tracks[0].artist).toBe("Tracy Chapman");
  });

  it("throws a descriptive error on malformed JSON", () => {
    expect(() => parseSpotifyExportFile("{ invalid json", "broken.json")).toThrow(
      /Malformed JSON/i,
    );
  });
});

describe("Spotify Matcher - Full Playlist Matching & Preservation", () => {
  const localCatalog: Track[] = [
    {
      id: "loc-song-1",
      title: "Clocks",
      artist: "Coldplay",
      album: "A Rush of Blood to the Head",
      duration: 307,
      cover: "",
      previewUrl: "",
    },
    {
      id: "loc-song-2",
      title: "Yellow",
      artist: "Coldplay",
      album: "Parachutes",
      duration: 269,
      cover: "",
      previewUrl: "",
    },
  ];

  it("matches tracks, preserves duplicate tracks and original ordering", () => {
    const playlist: ImportedSpotifyPlaylist = {
      name: "Coldplay Favorites",
      description: "Best of Coldplay",
      tracks: [
        {
          title: "Clocks",
          artist: "Coldplay",
          album: "A Rush of Blood to the Head",
          durationSec: 307,
          orderIndex: 0,
        },
        {
          title: "Unknown Rare Song",
          artist: "Unknown Indie Band",
          album: "Demo",
          durationSec: 180,
          orderIndex: 1,
        },
        {
          title: "Clocks",
          artist: "Coldplay",
          album: "A Rush of Blood to the Head",
          durationSec: 307,
          orderIndex: 2,
        }, // intentional duplicate
      ],
    };

    const summary = matchPlaylistToLibrary(playlist, localCatalog);
    expect(summary.results.length).toBe(3);
    // Order index 0 is Clocks -> matched
    expect(summary.results[0].status).toBe("matched");
    expect(summary.results[0].candidate?.id).toBe("loc-song-1");
    // Order index 1 is Unknown -> missing
    expect(summary.results[1].status).toBe("missing");
    expect(summary.results[1].candidate).toBeNull();
    // Order index 2 is Clocks (duplicate) preserved in place
    expect(summary.results[2].status).toBe("matched");
    expect(summary.results[2].candidate?.id).toBe("loc-song-1");

    expect(summary.matchedCount).toBe(2);
    expect(summary.missingCount).toBe(1);
  });
});
