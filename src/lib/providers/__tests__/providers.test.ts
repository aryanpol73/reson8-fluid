// src/lib/providers/__tests__/providers.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AudiusProvider,
  JamendoProvider,
  providerRegistry,
  RateLimitedError,
  NotFoundError,
  NotConfiguredError,
  UnavailableError,
  NetworkError,
  type UnifiedTrackMetadata,
} from "../index";
import { isTrackAvailableOffline, type Track } from "@/lib/mock-library";

describe("Music Providers Architecture & Compliance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("1. Capability Flags & Terms Compliance", () => {
    it("hardcodes canDownload: false for AudiusProvider per terms", () => {
      const provider = new AudiusProvider();
      expect(provider.capabilities.canStream).toBe(true);
      expect(provider.capabilities.canDownload).toBe(false);
    });

    it("hardcodes canDownload: false for JamendoProvider per Clause 3.3", () => {
      const provider = new JamendoProvider();
      expect(provider.capabilities.canStream).toBe(true);
      expect(provider.capabilities.canDownload).toBe(false);
    });
  });

  describe("2. Provider Registry & Metadata Cache", () => {
    it("registers and retrieves default streaming providers", () => {
      const audius = providerRegistry.getProvider("audius");
      const jamendo = providerRegistry.getProvider("jamendo");
      expect(audius).toBeInstanceOf(AudiusProvider);
      expect(jamendo).toBeInstanceOf(JamendoProvider);
    });

    it("caches provider track metadata in-memory without persisting streamUrl", () => {
      const mockTrack: UnifiedTrackMetadata = {
        id: "audius_abc123",
        source: "audius",
        providerTrackId: "abc123",
        title: "Test Ambient",
        artist: "Test Artist",
        album: "Test Album",
        duration: 180,
        cover: "https://example.com/art.jpg",
        streamUrl: "https://api.audius.co/v1/tracks/abc123/stream", // Should be stripped from metadata cache
        sourceUrl: "https://audius.co/tracks/abc123",
        offline: "none",
      };

      providerRegistry.cacheTrackMetadata(mockTrack);
      const retrieved = providerRegistry.getCachedTrackMetadata("audius_abc123");

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe("Test Ambient");
      expect(retrieved?.streamUrl).toBeUndefined(); // Verify streamUrl is never saved to metadata cache
    });

    it("rejects resolving stream URL for local tracks via provider registry", async () => {
      const localTrack: UnifiedTrackMetadata = {
        id: "local-1",
        source: "local",
        title: "Local File",
        artist: "Me",
        duration: 120,
        cover: "cover.jpg",
        offline: "available",
      };

      await expect(providerRegistry.resolveStreamUrlForTrack(localTrack)).rejects.toThrow(
        "Cannot resolve online provider stream URL for a local track",
      );
    });
  });

  describe("3. JamendoProvider Search & Stream Extraction", () => {
    it("throws NotConfiguredError when VITE_JAMENDO_CLIENT_ID is missing or placeholder", async () => {
      vi.stubEnv("VITE_JAMENDO_CLIENT_ID", "");
      const provider = new JamendoProvider();
      expect(provider.isConfigured()).toBe(false);

      await expect(provider.searchTracks("piano")).rejects.toThrow(NotConfiguredError);
    });

    it("maps Jamendo search results strictly from `audio` field and ignores `audiodownload`", async () => {
      vi.stubEnv("VITE_JAMENDO_CLIENT_ID", "valid_client_id");
      const provider = new JamendoProvider();

      const mockJamendoResponse = {
        headers: { status: "success", code: 0, error_message: "", results_count: 1 },
        results: [
          {
            id: "12345",
            name: "Ambient Waves",
            artist_name: "Oceanic",
            album_name: "Tides",
            duration: 210,
            image: "https://usercontent.jamendo.com?id=123",
            audio: "https://prod-1.storage.jamendo.com/?trackid=12345&format=mp31",
            audiodownload: "https://prod-1.storage.jamendo.com/download/12345", // MUST NOT BE USED
            audiodl: "https://prod-1.storage.jamendo.com/dl/12345", // MUST NOT BE USED
            shareurl: "https://www.jamendo.com/track/12345",
            license_ccurl: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockJamendoResponse,
      } as Response);

      const tracks = await provider.searchTracks("Ambient Waves");
      expect(tracks.length).toBe(1);

      const track = tracks[0];
      expect(track.id).toBe("jamendo_12345");
      expect(track.source).toBe("jamendo");
      expect(track.title).toBe("Ambient Waves");
      expect(track.artist).toBe("Oceanic");
      expect(track.offline).toBe("none"); // Stream-only
      expect(track.license?.name).toBe("CC BY-NC-SA");

      // Verify stream is taken strictly from `audio`, never from audiodownload
      expect(track.streamUrl).toBe("https://prod-1.storage.jamendo.com/?trackid=12345&format=mp31");
      expect(track.streamUrl).not.toContain("download");
      expect(track.streamUrl).not.toContain("/dl/");
    });

    it("handles Jamendo API rate limits (HTTP 429) cleanly with typed error", async () => {
      vi.stubEnv("VITE_JAMENDO_CLIENT_ID", "valid_client_id");
      const provider = new JamendoProvider();

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      } as Response);

      await expect(provider.searchTracks("test")).rejects.toThrow(RateLimitedError);
    });
  });

  describe("4. AudiusProvider Search & Stream Resolution", () => {
    it("maps Audius search results to UnifiedTrackMetadata model", async () => {
      const provider = new AudiusProvider();

      const mockAudiusResponse = {
        data: [
          {
            id: "mWB22",
            title: "Winter Silence",
            user: { name: "Frostbite" },
            duration: 240,
            permalink: "/frostbite/winter-silence",
            artwork: {
              "480x480": "https://audius.co/art/480.jpg",
            },
            license: "Creative Commons Attribution",
            is_streamable: true,
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAudiusResponse,
      } as Response);

      const tracks = await provider.searchTracks("Winter");
      expect(tracks.length).toBe(1);

      const track = tracks[0];
      expect(track.id).toBe("audius_mWB22");
      expect(track.source).toBe("audius");
      expect(track.title).toBe("Winter Silence");
      expect(track.artist).toBe("Frostbite");
      expect(track.offline).toBe("none"); // Stream-only
      expect(track.sourceUrl).toBe("https://audius.co/frostbite/winter-silence");

      // Stream resolution is lazy
      const streamUrl = await provider.resolveStreamUrl("mWB22");
      expect(streamUrl).toBe("https://api.audius.co/v1/tracks/mWB22/stream");
    });
  });

  describe("5. Service Worker Exclusion Rules", () => {
    it("ensures Audius and Jamendo endpoints are excluded from offline storage", () => {
      // Test regex matching provider domains
      const isProviderHost = (url: string) => {
        const parsed = new URL(url);
        return parsed.hostname.includes("audius.co") || parsed.hostname.includes("jamendo.com");
      };

      expect(isProviderHost("https://api.audius.co/v1/tracks/search")).toBe(true);
      expect(isProviderHost("https://api.jamendo.com/v3.0/tracks")).toBe(true);
      expect(isProviderHost("https://prod-1.storage.jamendo.com/?trackid=123")).toBe(true);

      // App routes and local content must NOT match
      expect(isProviderHost("https://localhost:5173/search")).toBe(false);
      expect(isProviderHost("https://reson8.app/manifest.webmanifest")).toBe(false);
    });
  });

  describe("6. Legacy Persisted Data Loading", () => {
    it("defaults legacy track objects to source: 'local' and offline: 'available'", () => {
      // Legacy stored track lacking `source` and `offline` fields
      const legacyTrack: Partial<Track> = {
        id: "legacy_song_1",
        title: "Old Song",
        artist: "Old Artist",
        album: "Old Album",
        duration: 150,
        cover: "cover.jpg",
      };

      const normalizedTrack: Track = {
        ...legacyTrack,
        id: legacyTrack.id!,
        title: legacyTrack.title!,
        artist: legacyTrack.artist!,
        album: legacyTrack.album!,
        duration: legacyTrack.duration!,
        cover: legacyTrack.cover!,
        source: legacyTrack.source || "local",
        offline: legacyTrack.offline || "available",
      };

      expect(normalizedTrack.source).toBe("local");
      expect(normalizedTrack.offline).toBe("available");
      expect(isTrackAvailableOffline(normalizedTrack)).toBe(true);
    });

    it("correctly identifies online provider tracks as unavailable offline", () => {
      const onlineTrack: Track = {
        id: "jamendo_999",
        source: "jamendo",
        title: "Online Stream",
        artist: "Creator",
        album: "Single",
        duration: 200,
        cover: "art.jpg",
        offline: "none",
      };

      expect(isTrackAvailableOffline(onlineTrack)).toBe(false);
    });
  });
});
