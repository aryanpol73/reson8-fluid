import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";

export type MusicTaste =
  | "All Genres & Mixes"
  | "Chill Lo-Fi & Beats"
  | "Synthwave & Electronic"
  | "Acoustic & Indie Folk"
  | "Upbeat Pop & Dance"
  | "Deep Focus & Ambient"
  | "Rock & Alternative";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: "google";
  musicTaste: MusicTaste;
  downloadedTrackIds: string[];
  createdAt: number;
}

interface AuthState {
  currentUser: UserAccount | null;
  savedAccounts: UserAccount[];
  googleClientId: string;
  isAuthDialogOpen: boolean;
  setAuthDialogOpen: (open: boolean) => void;
  setGoogleClientId: (clientId: string) => void;
  signInWithGoogle: (data?: Partial<UserAccount>) => UserAccount;
  signOut: () => void;
  switchAccount: (userId: string) => void;
  deleteAccount: (userId: string) => void;
  setMusicTaste: (taste: MusicTaste) => void;
  recordDownloadedTrack: (trackId: string) => void;
  removeDownloadedTrack: (trackId: string) => void;
}

const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      savedAccounts: [],
      googleClientId:
        typeof import.meta !== "undefined" && (import.meta.env?.VITE_GOOGLE_CLIENT_ID || import.meta.env?.GOOGLE_CLIENT_ID)
          ? import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID
          : "394307846802-37i8ju1vt3r4a2ggohdm330gnjs85li6.apps.googleusercontent.com",
      isAuthDialogOpen: false,

      setAuthDialogOpen: (open) => set({ isAuthDialogOpen: open }),

      setGoogleClientId: (googleClientId) => set({ googleClientId }),

      signInWithGoogle: (data) => {
        if (!data || !data.email) {
          throw new Error("Valid Google account email required for authentication");
        }
        const email = data.email.trim();
        const name = data.name?.trim() || email.split("@")[0] || "Google User";
        const id = data.id || `google_${email.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
        const avatar =
          data.avatar ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(id)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
        const musicTaste = data.musicTaste || "Chill Lo-Fi & Beats";

        const existing = get().savedAccounts.find((a) => a.id === id || a.email.toLowerCase() === email.toLowerCase());
        const account: UserAccount = existing
          ? {
              ...existing,
              name: data.name || existing.name,
              avatar: data.avatar || existing.avatar,
              musicTaste: data.musicTaste || existing.musicTaste,
            }
          : {
              id,
              name,
              email,
              avatar,
              provider: "google",
              musicTaste,
              downloadedTrackIds: data.downloadedTrackIds || [],
              createdAt: Date.now(),
            };

        const otherAccounts = get().savedAccounts.filter((a) => a.id !== account.id);

        set({
          currentUser: account,
          savedAccounts: [account, ...otherAccounts],
          isAuthDialogOpen: false,
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("reson8-user-changed", { detail: { userId: account.id } }));
        }

        return account;
      },

      signOut: () => {
        set({ currentUser: null, isAuthDialogOpen: false });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("reson8-user-changed", { detail: { userId: null } }));
        }
      },

      switchAccount: (userId) => {
        const target = get().savedAccounts.find((a) => a.id === userId);
        if (target) {
          set({ currentUser: target, isAuthDialogOpen: false });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("reson8-user-changed", { detail: { userId: target.id } }));
          }
        }
      },

      deleteAccount: (userId) => {
        const state = get();
        const updated = state.savedAccounts.filter((a) => a.id !== userId);
        const isCurrent = state.currentUser?.id === userId;
        set({
          savedAccounts: updated,
          currentUser: isCurrent ? (updated[0] ?? null) : state.currentUser,
        });
        if (isCurrent && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("reson8-user-changed", { detail: { userId: updated[0]?.id ?? null } }),
          );
        }
      },

      setMusicTaste: (taste) => {
        const current = get().currentUser;
        if (!current) return;
        const updated: UserAccount = { ...current, musicTaste: taste };
        set({
          currentUser: updated,
          savedAccounts: get().savedAccounts.map((a) => (a.id === updated.id ? updated : a)),
        });
      },

      recordDownloadedTrack: (trackId) => {
        const current = get().currentUser;
        if (!current) return;
        if (current.downloadedTrackIds.includes(trackId)) return;
        const updated: UserAccount = {
          ...current,
          downloadedTrackIds: [trackId, ...current.downloadedTrackIds],
        };
        set({
          currentUser: updated,
          savedAccounts: get().savedAccounts.map((a) => (a.id === updated.id ? updated : a)),
        });
      },

      removeDownloadedTrack: (trackId) => {
        const current = get().currentUser;
        if (!current) return;
        const updated: UserAccount = {
          ...current,
          downloadedTrackIds: current.downloadedTrackIds.filter((id) => id !== trackId),
        };
        set({
          currentUser: updated,
          savedAccounts: get().savedAccounts.map((a) => (a.id === updated.id ? updated : a)),
        });
      },
    }),
    {
      name: "reson8-auth",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : dummyStorage)),
      skipHydration: true,
    },
  ),
);

const isDummyAccount = (account?: UserAccount | null) => {
  if (!account) return false;
  const lowerEmail = account.email.toLowerCase();
  return (
    account.id.startsWith("g_alex") ||
    account.id.startsWith("g_sarah") ||
    account.id.startsWith("g_marcus") ||
    account.id.startsWith("g_elena") ||
    lowerEmail.includes("alex.rivera@") ||
    lowerEmail.includes("sarah.vance@") ||
    lowerEmail.includes("marcus.lee@") ||
    lowerEmail.includes("elena.rostova@")
  );
};

export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useAuth.persist.rehydrate();
    const state = useAuth.getState();
    if (isDummyAccount(state.currentUser)) {
      const filtered = state.savedAccounts.filter((a) => !isDummyAccount(a));
      useAuth.setState({
        currentUser: filtered[0] || null,
        savedAccounts: filtered,
      });
    } else if (state.savedAccounts.some(isDummyAccount)) {
      useAuth.setState({
        savedAccounts: state.savedAccounts.filter((a) => !isDummyAccount(a)),
      });
    }
    setHydrated(true);
  }, []);
  return hydrated;
}
