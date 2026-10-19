// src/lib/providers/types.ts
// Provider abstraction & typed errors for online streaming services.

export type TrackSource = "local" | "audius" | "jamendo";

export interface TrackLicense {
  name: string;
  url?: string;
}

export interface ProviderCapabilities {
  canStream: boolean;
  canDownload: boolean; // Hardcoded false for both Audius and Jamendo per platform terms
}

// Typed Errors for Provider operations
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: TrackSource,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class NotConfiguredError extends ProviderError {
  constructor(providerId: TrackSource, message = "Provider credentials are not configured") {
    super(message, providerId, 401);
    this.name = "NotConfiguredError";
  }
}

export class RateLimitedError extends ProviderError {
  constructor(providerId: TrackSource, message = "Rate limit reached. Please wait a moment.") {
    super(message, providerId, 429);
    this.name = "RateLimitedError";
  }
}

export class NotFoundError extends ProviderError {
  constructor(providerId: TrackSource, message = "Track not found on provider") {
    super(message, providerId, 404);
    this.name = "NotFoundError";
  }
}

export class UnavailableError extends ProviderError {
  constructor(providerId: TrackSource, message = "Track is currently unavailable for streaming") {
    super(message, providerId, 503);
    this.name = "UnavailableError";
  }
}

export class NetworkError extends ProviderError {
  constructor(providerId: TrackSource, message = "Network error connecting to music provider") {
    super(message, providerId, 0);
    this.name = "NetworkError";
  }
}

export interface ProviderSearchOptions {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

// Unified track metadata interface (re-exported/mirrored from Track)
export interface UnifiedTrackMetadata {
  id: string;
  source?: TrackSource;
  providerTrackId?: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  cover: string; // Artwork image URL
  artworkUrl?: string; // Standard alias
  previewUrl?: string; // Used by local/demo tracks
  streamUrl?: string; // Resolved lazily at playtime; NEVER saved to persistent storage
  sourceUrl?: string; // Deep-link back to provider track page
  license?: TrackLicense;
  attribution?: string; // e.g. "Music by [Artist] on [Provider]"
  offline?: "available" | "none";
}

export interface MusicProvider {
  readonly id: "audius" | "jamendo";
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  isConfigured(): boolean;
  searchTracks(query: string, opts?: ProviderSearchOptions): Promise<UnifiedTrackMetadata[]>;
  getTrack(id: string, opts?: { signal?: AbortSignal }): Promise<UnifiedTrackMetadata>;
  resolveStreamUrl(id: string, opts?: { signal?: AbortSignal }): Promise<string>;
}
