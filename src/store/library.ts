import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { coverForSeed, getTrack, type Track } from "@/lib/mock-library";

export interface UserPlaylist {
  id: string;
  name: string;
  description: string;
  cover: string;
  trackIds: string[];
  createdAt: number;
}

interface LibraryState {
  playlists: UserPlaylist[];
  liked: string[];
  recent: string[];
  followedArtists: string[];
  savedAlbums: string[];
  createPlaylist: (name: string, description?: string, trackIds?: string[]) => string;
  renamePlaylist: (id: string, name: string, description?: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, trackId: string) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
  toggleLike: (trackId: string) => void;
  isLiked: (trackId: string) => boolean;
  pushRecent: (trackId: string) => void;
  toggleFollowArtist: (name: string) => void;
  toggleSaveAlbum: (id: string) => void;
}

const uid = () => `up_${Math.random().toString(36).slice(2, 9)}`;

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      playlists: [],
      liked: [],
      recent: [],
      followedArtists: [],
      savedAlbums: [],

      createPlaylist: (name, description = "", trackIds = []) => {
        const id = uid();
        const cover = trackIds[0]
          ? (getTrack(trackIds[0])?.cover ?? coverForSeed(id))
          : coverForSeed(id);
        set((s) => ({
          playlists: [
            { id, name, description, cover, trackIds, createdAt: Date.now() },
            ...s.playlists,
          ],
        }));
        return id;
      },

      renamePlaylist: (id, name, description) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, name, description: description ?? p.description } : p,
          ),
        })),

      deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

      addToPlaylist: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== id || p.trackIds.includes(trackId)) return p;
            const trackIds = [...p.trackIds, trackId];
            return {
              ...p,
              trackIds,
              cover: p.trackIds.length === 0 ? (getTrack(trackId)?.cover ?? p.cover) : p.cover,
            };
          }),
        })),

      removeFromPlaylist: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
          ),
        })),

      toggleLike: (trackId) =>
        set((s) => ({
          liked: s.liked.includes(trackId)
            ? s.liked.filter((t) => t !== trackId)
            : [trackId, ...s.liked],
        })),

      isLiked: (trackId) => get().liked.includes(trackId),

      pushRecent: (trackId) =>
        set((s) => ({ recent: [trackId, ...s.recent.filter((t) => t !== trackId)].slice(0, 20) })),

      toggleFollowArtist: (name) =>
        set((s) => ({
          followedArtists: s.followedArtists.includes(name)
            ? s.followedArtists.filter((a) => a !== name)
            : [name, ...s.followedArtists],
        })),

      toggleSaveAlbum: (id) =>
        set((s) => ({
          savedAlbums: s.savedAlbums.includes(id)
            ? s.savedAlbums.filter((a) => a !== id)
            : [id, ...s.savedAlbums],
        })),
    }),
    {
      name: "reson8-library",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/**
 * Persisted state is only read on the client, so gate anything that renders
 * saved data until after hydration to keep SSR markup stable.
 */
export function useLibraryHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useLibrary.persist.rehydrate();
    setHydrated(true);
  }, []);
  return hydrated;
}

export const playlistTracks = (p: UserPlaylist): Track[] =>
  p.trackIds.map(getTrack).filter((t): t is Track => Boolean(t));
