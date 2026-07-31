/**
 * Spotify Web API via PKCE — runs entirely in the browser, no server secret.
 * The listener supplies their own Client ID in Settings, so nothing is baked
 * into the build.
 */
const CLIENT_ID_KEY = "reson8-spotify-client-id";
const TOKEN_KEY = "reson8-spotify-token";
const VERIFIER_KEY = "reson8-spotify-verifier";

export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "user-top-read",
  "user-read-recently-played",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export interface SpotifyToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export const redirectUri = () =>
  typeof window === "undefined" ? "" : `${window.location.origin}/spotify-callback`;

export const getClientId = () =>
  typeof window === "undefined" ? "" : (localStorage.getItem(CLIENT_ID_KEY) ?? "");
export const setClientId = (id: string) => localStorage.setItem(CLIENT_ID_KEY, id.trim());

export function getToken(): SpotifyToken | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null");
  } catch {
    return null;
  }
}
const saveToken = (t: SpotifyToken) => localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
export const disconnectSpotify = () => localStorage.removeItem(TOKEN_KEY);

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function beginSpotifyLogin() {
  const clientId = getClientId();
  if (!clientId) throw new Error("Add your Spotify Client ID first.");
  const verifier = randomString();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: await challengeFor(verifier),
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function completeSpotifyLogin(code: string) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const clientId = getClientId();
  if (!verifier || !clientId) throw new Error("Login session expired — try connecting again.");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Spotify rejected the login (${res.status}).`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  sessionStorage.removeItem(VERIFIER_KEY);
  saveToken({
    access_token: data.access_token,
    ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    expires_at: Date.now() + data.expires_in * 1000,
  });
}

async function refresh(token: SpotifyToken): Promise<SpotifyToken | null> {
  const clientId = getClientId();
  if (!token.refresh_token || !clientId) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const next: SpotifyToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? token.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  saveToken(next);
  return next;
}

export async function spotifyFetch<T>(path: string): Promise<T> {
  let token = getToken();
  if (!token) throw new Error("Not connected to Spotify.");
  if (token.expires_at - 30_000 < Date.now()) {
    token = (await refresh(token)) ?? token;
  }
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (res.status === 401) {
    disconnectSpotify();
    throw new Error("Spotify session expired — reconnect in Settings.");
  }
  if (!res.ok) throw new Error(`Spotify request failed (${res.status}).`);
  return (await res.json()) as T;
}

export interface SpotifyProfile {
  display_name: string;
  email?: string;
  images?: { url: string }[];
  product?: string;
}

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

export const fetchSpotifyProfile = () => spotifyFetch<SpotifyProfile>("/me");
export const fetchSpotifyPlaylists = () =>
  spotifyFetch<{ items: SpotifyPlaylistSummary[] }>("/me/playlists?limit=24");
