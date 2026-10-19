// src/lib/providers/registry.ts
// Central provider registry for Reson8 online streaming services.

import {
  type MusicProvider,
  type TrackSource,
  type UnifiedTrackMetadata,
  type ProviderSearchOptions,
  NotFoundError,
  UnavailableError,
} from "./types";
import { AudiusProvider } from "./audius";
import { JamendoProvider } from "./jamendo";

class ProviderRegistry {
  private readonly providers = new Map<TrackSource, MusicProvider>();

  // In-memory catalog of provider tracks that have been loaded, queued, or added to playlists
  private readonly inMemoryTrackMetadata = new Map<string, UnifiedTrackMetadata>();

  constructor() {
    this.register(new AudiusProvider());
    this.register(new JamendoProvider());
  }

  public register(provider: MusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: TrackSource): MusicProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  public getConfiguredProviders(): MusicProvider[] {
    return this.getAllProviders().filter((p) => p.isConfigured());
  }

  public cacheTrackMetadata(track: UnifiedTrackMetadata): void {
    if (!track.id) return;
    // Store metadata ONLY. Do NOT persist streamUrl.
    const safeMetadata: UnifiedTrackMetadata = {
      ...track,
      streamUrl: undefined, // Ensure streamUrl is never cached as persistent metadata
    };
    this.inMemoryTrackMetadata.set(track.id, safeMetadata);
    if (track.providerTrackId) {
      this.inMemoryTrackMetadata.set(`${track.source}_${track.providerTrackId}`, safeMetadata);
    }
  }

  public getCachedTrackMetadata(id: string): UnifiedTrackMetadata | undefined {
    return this.inMemoryTrackMetadata.get(id);
  }

  public async searchAll(
    query: string,
    opts: ProviderSearchOptions = {},
  ): Promise<{
    results: UnifiedTrackMetadata[];
    errors: Partial<Record<TrackSource, Error>>;
  }> {
    const activeProviders = this.getAllProviders();
    const errors: Partial<Record<TrackSource, Error>> = {};
    const results: UnifiedTrackMetadata[] = [];

    const promises = activeProviders.map(async (provider) => {
      try {
        if (!provider.isConfigured()) return [];
        const tracks = await provider.searchTracks(query, opts);
        for (const t of tracks) {
          this.cacheTrackMetadata(t);
        }
        return tracks;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw err;
        }
        errors[provider.id] = err as Error;
        return [];
      }
    });

    const settled = await Promise.all(promises);
    for (const batch of settled) {
      results.push(...batch);
    }

    return { results, errors };
  }

  public async resolveStreamUrlForTrack(
    track: UnifiedTrackMetadata,
    opts: { signal?: AbortSignal } = {},
  ): Promise<string> {
    if (!track.source || track.source === "local") {
      throw new Error("Cannot resolve online provider stream URL for a local track");
    }

    const provider = this.getProvider(track.source);
    if (!provider) {
      throw new UnavailableError(
        track.source,
        `No provider registered for source "${track.source}"`,
      );
    }

    const trackId = track.providerTrackId || track.id.replace(`${track.source}_`, "");
    const streamUrl = await provider.resolveStreamUrl(trackId, opts);
    if (!streamUrl) {
      throw new NotFoundError(
        track.source,
        `Failed to resolve stream URL for track "${track.title}"`,
      );
    }

    return streamUrl;
  }
}

export const providerRegistry = new ProviderRegistry();
