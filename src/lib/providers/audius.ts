// src/lib/providers/audius.ts
// Audius Music Provider (api.audius.co/v1)
// Note: Per Audius documentation (docs.audius.org), bearer tokens are strictly
// backend-only and MUST NEVER be exposed in frontend code. Public read-only
// endpoints (search, trending, stream) operate client-side without credentials,
// or with an optional public API key (VITE_AUDIUS_API_KEY).

import {
  type MusicProvider,
  type ProviderCapabilities,
  type ProviderSearchOptions,
  type UnifiedTrackMetadata,
  NetworkError,
  NotFoundError,
  RateLimitedError,
  UnavailableError,
} from "./types";

interface AudiusRawTrack {
  id: string;
  title: string;
  user?: {
    name?: string;
    handle?: string;
  };
  duration: number; // in seconds
  permalink?: string;
  artwork?: {
    "150x150"?: string;
    "480x480"?: string;
    "1000x1000"?: string;
  };
  license?: string;
  is_streamable?: boolean;
}

export class AudiusProvider implements MusicProvider {
  public readonly id = "audius" as const;
  public readonly name = "Audius";

  // Hard-coded false for downloads per Audius terms:
  // Offline storage is restricted to official mobile clients.
  // Downloading requires explicit artist permissions; streams cannot be cached offline.
  public readonly capabilities: ProviderCapabilities = {
    canStream: true,
    canDownload: false,
  };

  private readonly baseUrl = "https://api.audius.co/v1";

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

  public isConfigured(): boolean {
    // Audius public API does not require credentials for search and streaming.
    return true;
  }

  private getApiKey(): string | undefined {
    return import.meta.env.VITE_AUDIUS_API_KEY || undefined;
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Accept: "application/json",
    };
    const apiKey = this.getApiKey();
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }
    return headers;
  }

  public async searchTracks(
    query: string,
    opts: ProviderSearchOptions = {},
  ): Promise<UnifiedTrackMetadata[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cacheKey = `${trimmed}_${opts.limit || 20}_${opts.offset || 0}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const limit = Math.min(opts.limit || 20, 50);
    const offset = opts.offset || 0;
    const url = new URL(`${this.baseUrl}/tracks/search`);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const apiKey = this.getApiKey();
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.buildHeaders(),
        signal: opts.signal,
      });

      if (res.status === 429) {
        throw new RateLimitedError(this.id, "Audius rate limit reached. Please wait a moment.");
      }
      if (!res.ok) {
        throw new UnavailableError(this.id, `Audius search failed with status ${res.status}`);
      }

      const json = (await res.json()) as { data?: AudiusRawTrack[] };
      const rawTracks = json.data || [];
      const mapped = rawTracks
        .filter((t) => t && t.id && t.is_streamable !== false)
        .map((t) => this.mapRawTrack(t));

      this.searchCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
      for (const track of mapped) {
        this.trackCache.set(track.id, { timestamp: Date.now(), data: track });
      }

      return mapped;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      if (err instanceof RateLimitedError || err instanceof UnavailableError) {
        throw err;
      }
      throw new NetworkError(this.id, `Failed to connect to Audius: ${(err as Error).message}`);
    }
  }

  public async getTrack(
    id: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<UnifiedTrackMetadata> {
    const rawId = id.startsWith("audius_") ? id.replace("audius_", "") : id;
    const cached = this.trackCache.get(rawId) || this.trackCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const url = new URL(`${this.baseUrl}/tracks/${encodeURIComponent(rawId)}`);
    const apiKey = this.getApiKey();
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.buildHeaders(),
        signal: opts.signal,
      });

      if (res.status === 404) {
        throw new NotFoundError(this.id, `Track ${rawId} was not found on Audius`);
      }
      if (res.status === 429) {
        throw new RateLimitedError(this.id);
      }
      if (!res.ok) {
        throw new UnavailableError(this.id, `Audius returned HTTP ${res.status}`);
      }

      const json = (await res.json()) as { data?: AudiusRawTrack };
      if (!json.data) {
        throw new NotFoundError(this.id, `Track ${rawId} not found`);
      }

      const track = this.mapRawTrack(json.data);
      this.trackCache.set(track.id, { timestamp: Date.now(), data: track });
      return track;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (
        err instanceof NotFoundError ||
        err instanceof RateLimitedError ||
        err instanceof UnavailableError
      ) {
        throw err;
      }
      throw new NetworkError(this.id, `Audius track fetch failed: ${(err as Error).message}`);
    }
  }

  public async resolveStreamUrl(id: string): Promise<string> {
    const rawId = id.startsWith("audius_") ? id.replace("audius_", "") : id;
    const apiKey = this.getApiKey();
    const query = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";
    // Audius stream endpoint redirects (302) to audio storage
    return `${this.baseUrl}/tracks/${encodeURIComponent(rawId)}/stream${query}`;
  }

  private mapRawTrack(t: AudiusRawTrack): UnifiedTrackMetadata {
    const artwork =
      t.artwork?.["480x480"] ||
      t.artwork?.["1000x1000"] ||
      t.artwork?.["150x150"] ||
      "https://picsum.photos/seed/audius/400/400";

    const artistName = t.user?.name || "Unknown Artist";
    const permalink = t.permalink
      ? `https://audius.co${t.permalink}`
      : `https://audius.co/track/${t.id}`;

    return {
      id: `audius_${t.id}`,
      source: "audius",
      providerTrackId: t.id,
      title: t.title || "Untitled Track",
      artist: artistName,
      album: "Audius Release",
      duration: Math.round(t.duration || 0),
      cover: artwork,
      artworkUrl: artwork,
      sourceUrl: permalink,
      license: {
        name: t.license || "All Rights Reserved",
      },
      attribution: `Streamed via Audius · Music by ${artistName}`,
      offline: "none", // Provider tracks are stream-only; never available offline
    };
  }
}
