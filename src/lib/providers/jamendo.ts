// src/lib/providers/jamendo.ts
// Jamendo Music Provider (api.jamendo.com/v3.0)
//
// TERMS & ARCHITECTURE COMPLIANCE:
// 1. Caching & Offline: Clause 3.3 of the Jamendo API Terms of Use strictly mandates:
//    "Applications must not be specifically designed to cache the content nor offering an offline access to the content."
//    Therefore, tracks from Jamendo are STREAM-ONLY. canDownload is hardcoded to false.
// 2. Audio Streaming Field: Streams are resolved ONLY from the `audio` field.
//    Per architectural specifications, the `audiodownload` / `audiodl` fields are NEVER read,
//    stored, fetched, or linked.
// 3. Secrets: JAMENDO_CLIENT_SECRET is never referenced or exposed. Only VITE_JAMENDO_CLIENT_ID is used.

import {
  type MusicProvider,
  type ProviderCapabilities,
  type ProviderSearchOptions,
  type UnifiedTrackMetadata,
  NetworkError,
  NotConfiguredError,
  NotFoundError,
  RateLimitedError,
  UnavailableError,
} from "./types";

interface JamendoRawTrack {
  id: string;
  name: string;
  duration: number; // in seconds
  artist_name?: string;
  album_name?: string;
  image?: string;
  audio?: string; // Authorized streaming URL
  shareurl?: string;
  license_ccurl?: string;
}

interface JamendoApiResponse {
  headers: {
    status: string;
    code: number;
    error_message: string;
    warnings: string;
    results_count: number;
  };
  results: JamendoRawTrack[];
}

export class JamendoProvider implements MusicProvider {
  public readonly id = "jamendo" as const;
  public readonly name = "Jamendo";

  // Hardcoded false per Jamendo API Terms of Use Clause 3.3:
  // "Applications must not be specifically designed to cache the content nor offering an offline access to the content."
  public readonly capabilities: ProviderCapabilities = {
    canStream: true,
    canDownload: false,
  };

  private readonly baseUrl = "https://api.jamendo.com/v3.0";

  // Short-lived in-memory cache (3 minutes) to prevent redundant API queries
  private readonly searchCache = new Map<
    string,
    { timestamp: number; data: UnifiedTrackMetadata[] }
  >();
  private readonly trackCache = new Map<
    string,
    { timestamp: number; data: UnifiedTrackMetadata }
  >();
  private readonly CACHE_TTL_MS = 3 * 60 * 1000;

  private getClientId(): string | undefined {
    return import.meta.env.VITE_JAMENDO_CLIENT_ID?.trim() || undefined;
  }

  public isConfigured(): boolean {
    const id = this.getClientId();
    return Boolean(id && id.length > 0 && id !== "your_jamendo_client_id_here");
  }

  public async searchTracks(
    query: string,
    opts: ProviderSearchOptions = {},
  ): Promise<UnifiedTrackMetadata[]> {
    if (!this.isConfigured()) {
      throw new NotConfiguredError(
        this.id,
        "Jamendo is not configured. Please set VITE_JAMENDO_CLIENT_ID in your environment.",
      );
    }

    const trimmed = query.trim();
    if (!trimmed) return [];

    const clientId = this.getClientId()!;
    const limit = Math.min(opts.limit || 20, 50);
    const offset = opts.offset || 0;
    const cacheKey = `${trimmed}_${limit}_${offset}`;

    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const url = new URL(`${this.baseUrl}/tracks/`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("fuzzysearch", trimmed);
    url.searchParams.set("include", "licenses");
    url.searchParams.set("audioformat", "mp31"); // standard MP3 stream format

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      });

      if (res.status === 429) {
        throw new RateLimitedError(this.id, "Jamendo rate limit reached. Please wait a moment.");
      }
      if (!res.ok) {
        throw new UnavailableError(this.id, `Jamendo search failed with HTTP ${res.status}`);
      }

      const json = (await res.json()) as JamendoApiResponse;
      if (json.headers?.status === "failed") {
        if (json.headers.code === 11 || json.headers.code === 5) {
          throw new NotConfiguredError(this.id, `Jamendo API Error: ${json.headers.error_message}`);
        }
        throw new UnavailableError(this.id, `Jamendo API Error: ${json.headers.error_message}`);
      }

      const rawTracks = json.results || [];
      const mapped = rawTracks
        .filter((t) => t && t.id && t.audio) // Streamable only
        .map((t) => this.mapRawTrack(t));

      this.searchCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
      for (const track of mapped) {
        this.trackCache.set(track.id, { timestamp: Date.now(), data: track });
      }

      return mapped;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (
        err instanceof NotConfiguredError ||
        err instanceof RateLimitedError ||
        err instanceof UnavailableError
      ) {
        throw err;
      }
      throw new NetworkError(this.id, `Failed to connect to Jamendo: ${(err as Error).message}`);
    }
  }

  public async getTrack(
    id: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<UnifiedTrackMetadata> {
    if (!this.isConfigured()) {
      throw new NotConfiguredError(this.id);
    }

    const rawId = id.startsWith("jamendo_") ? id.replace("jamendo_", "") : id;
    const cached = this.trackCache.get(rawId) || this.trackCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const clientId = this.getClientId()!;
    const url = new URL(`${this.baseUrl}/tracks/`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("format", "json");
    url.searchParams.set("id", rawId);
    url.searchParams.set("include", "licenses");
    url.searchParams.set("audioformat", "mp31");

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      });

      if (res.status === 429) throw new RateLimitedError(this.id);
      if (!res.ok) throw new UnavailableError(this.id, `Jamendo returned HTTP ${res.status}`);

      const json = (await res.json()) as JamendoApiResponse;
      if (json.headers?.status === "failed") {
        throw new UnavailableError(this.id, json.headers.error_message);
      }

      const raw = json.results?.[0];
      if (!raw) {
        throw new NotFoundError(this.id, `Track ${rawId} not found on Jamendo`);
      }

      const track = this.mapRawTrack(raw);
      this.trackCache.set(track.id, { timestamp: Date.now(), data: track });
      return track;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (
        err instanceof NotConfiguredError ||
        err instanceof NotFoundError ||
        err instanceof RateLimitedError ||
        err instanceof UnavailableError
      ) {
        throw err;
      }
      throw new NetworkError(this.id, `Jamendo track fetch failed: ${(err as Error).message}`);
    }
  }

  public async resolveStreamUrl(id: string, opts: { signal?: AbortSignal } = {}): Promise<string> {
    const rawId = id.startsWith("jamendo_") ? id.replace("jamendo_", "") : id;
    // Check if we have the track in-memory with its direct audio stream URL
    const cached = this.trackCache.get(rawId) || this.trackCache.get(id);
    if (cached?.data?.streamUrl) {
      return cached.data.streamUrl;
    }

    // Otherwise fetch the fresh track object and extract the audio field
    const track = await this.getTrack(rawId, opts);
    if (!track.streamUrl) {
      throw new UnavailableError(this.id, "No streaming audio link available for this track");
    }
    return track.streamUrl;
  }

  private mapRawTrack(t: JamendoRawTrack): UnifiedTrackMetadata {
    const artwork =
      t.image ||
      (t.id
        ? `https://usercontent.jamendo.com?type=album&id=${t.id}&width=300`
        : "https://picsum.photos/seed/jamendo/400/400");
    const artistName = t.artist_name || "Unknown Artist";
    const shareUrl = t.shareurl || `https://www.jamendo.com/track/${t.id}`;

    // Extract license name from license_ccurl
    let licenseName = "Creative Commons";
    if (t.license_ccurl) {
      if (t.license_ccurl.includes("by-nc-nd")) licenseName = "CC BY-NC-ND";
      else if (t.license_ccurl.includes("by-nc-sa")) licenseName = "CC BY-NC-SA";
      else if (t.license_ccurl.includes("by-nc")) licenseName = "CC BY-NC";
      else if (t.license_ccurl.includes("by-sa")) licenseName = "CC BY-SA";
      else if (t.license_ccurl.includes("by-nd")) licenseName = "CC BY-ND";
      else if (t.license_ccurl.includes("by")) licenseName = "CC BY";
    }

    return {
      id: `jamendo_${t.id}`,
      source: "jamendo",
      providerTrackId: t.id,
      title: t.name || "Untitled Track",
      artist: artistName,
      album: t.album_name || "Jamendo Release",
      duration: Math.round(t.duration || 0),
      cover: artwork,
      artworkUrl: artwork,
      // Stream URL resolved ONLY from the `audio` field:
      streamUrl: t.audio || undefined,
      sourceUrl: shareUrl,
      license: {
        name: licenseName,
        url: t.license_ccurl,
      },
      attribution: `Jamendo Licensed · Music by ${artistName}`,
      offline: "none", // Provider tracks are stream-only; never available offline
    };
  }
}
