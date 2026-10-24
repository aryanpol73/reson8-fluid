import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useAuth,
  type MusicTaste,
  type UserAccount,
} from "@/store/auth";
import { useLibrary } from "@/store/library";
import {
  Sparkles,
  Download,
  Heart,
  Music,
  LogOut,
  UserCheck,
  Plus,
  Compass,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

const TASTES: MusicTaste[] = [
  "All Genres & Mixes",
  "Chill Lo-Fi & Beats",
  "Synthwave & Electronic",
  "Acoustic & Indie Folk",
  "Upbeat Pop & Dance",
  "Deep Focus & Ambient",
  "Rock & Alternative",
];

export function GoogleAuthDialog() {
  const isOpen = useAuth((s) => s.isAuthDialogOpen);
  const setOpen = useAuth((s) => s.setAuthDialogOpen);
  const currentUser = useAuth((s) => s.currentUser);
  const savedAccounts = useAuth((s) => s.savedAccounts);
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const signOut = useAuth((s) => s.signOut);
  const switchAccount = useAuth((s) => s.switchAccount);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const setMusicTaste = useAuth((s) => s.setMusicTaste);
  const googleClientId = useAuth((s) => s.googleClientId);
  const setGoogleClientId = useAuth((s) => s.setGoogleClientId);

  const likedCount = useLibrary((s) => s.liked.length);
  const playlistCount = useLibrary((s) => s.playlists.length);

  const DEFAULT_CLIENT_ID = "394307846802-37i8ju1vt3r4a2ggohdm330gnjs85li6.apps.googleusercontent.com";
  const activeClientId = googleClientId || DEFAULT_CLIENT_ID;

  const [selectedTaste, setSelectedTaste] = useState<MusicTaste>(
    currentUser?.musicTaste || "Chill Lo-Fi & Beats",
  );
  const [isGsiLoading, setIsGsiLoading] = useState(false);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
  const redirectUri = `${originUrl}/google-callback`;

  const handleOfficialGoogleSignIn = () => {

    const win = window as unknown as {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              callback: (response: { access_token?: string; error?: string }) => void;
            }) => { requestAccessToken: () => void };
          };
        };
      };
    };

    if (win.google?.accounts?.oauth2) {
      try {
        setIsGsiLoading(true);
        const client = win.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: "openid email profile",
          callback: async (resp) => {
            setIsGsiLoading(false);
            if (resp.access_token) {
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                if (!res.ok) throw new Error("Failed to load Google profile");
                const info = await res.json();
                const acc = signInWithGoogle({
                  id: `google_${info.sub}`,
                  name: info.name || info.email.split("@")[0] || "Google User",
                  email: info.email,
                  avatar: info.picture,
                  musicTaste: selectedTaste,
                });
                toast.success(`Signed in as ${acc.name}!`);
              } catch (e) {
                toast.error("Failed to fetch Google profile: " + (e as Error).message);
              }
            } else if (resp.error) {
              toast.error("Google OAuth error: " + resp.error);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        setIsGsiLoading(false);
        console.warn("Falling back to OAuth 2.0 direct redirect:", err);
      }
    }

    // Direct redirect fallback
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      activeClientId,
    )}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=token&scope=openid%20email%20profile&prompt=select_account`;
    window.location.href = authUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="glass-panel border-white/10 text-white max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
              <GoogleIcon className="h-4 w-4" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">Google Account</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {currentUser ? "Your Reson8 Account" : "Sign in with Google"}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/55">
            {currentUser
              ? "Manage your personal profile, music recommendations, and offline downloaded music."
              : "Every user has their own personal music collection, custom playlists, and offline downloads."}
          </DialogDescription>
        </DialogHeader>

        {currentUser ? (
          <div className="space-y-5 pt-2">
            {/* Active User Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-cyan-400/40"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate text-white">{currentUser.name}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[10px] font-medium ring-1 ring-emerald-500/20">
                    <UserCheck className="h-2.5 w-2.5" /> Connected
                  </span>
                </div>
                <div className="text-xs text-white/50 truncate">{currentUser.email}</div>
                <div className="text-[11px] text-cyan-300 flex items-center gap-1 mt-0.5">
                  <Compass className="h-3 w-3" /> Taste: {currentUser.musicTaste}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Download className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{currentUser.downloadedTrackIds.length}</div>
                <div className="text-[10px] text-white/50 uppercase">Downloads</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Heart className="h-4 w-4 text-pink-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{likedCount}</div>
                <div className="text-[10px] text-white/50 uppercase">Liked Songs</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Music className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{playlistCount}</div>
                <div className="text-[10px] text-white/50 uppercase">Playlists</div>
              </div>
            </div>

            {/* Music Taste Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Get Different Music (Your Vibe)
                </span>
                <span className="text-[10px] text-white/45">Customizes recommendations</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {TASTES.map((taste) => (
                  <button
                    key={taste}
                    type="button"
                    onClick={() => {
                      setMusicTaste(taste);
                      toast.success(`Music vibe changed to ${taste}`);
                    }}
                    className={`text-xs px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentUser.musicTaste === taste
                        ? "bg-white/15 border-cyan-400/50 text-white font-medium ring-1 ring-cyan-400/40"
                        : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="truncate">{taste}</span>
                    {currentUser.musicTaste === taste && <Check className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Other Saved Accounts */}
            {savedAccounts.filter((a) => a.id !== currentUser.id).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-white/70">Switch Account</span>
                <div className="space-y-1.5">
                  {savedAccounts
                    .filter((a) => a.id !== currentUser.id)
                    .map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={acc.avatar} alt={acc.name} className="h-7 w-7 rounded-full object-cover" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate">{acc.name}</div>
                            <div className="text-[10px] text-white/40 truncate">{acc.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => switchAccount(acc.id)}>
                            Switch
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => deleteAccount(acc.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/15 cursor-pointer"
                onClick={() => {
                  signOut();
                  toast.success("Signed out of Reson8");
                }}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={handleOfficialGoogleSignIn}
                disabled={isGsiLoading}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Account
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Button
              type="button"
              disabled={isGsiLoading}
              onClick={handleOfficialGoogleSignIn}
              className="w-full h-11 bg-white text-black hover:bg-white/90 font-medium text-sm flex items-center justify-center gap-3 cursor-pointer rounded-xl"
            >
              <GoogleIcon className="h-4 w-4" />
              {isGsiLoading ? "Connecting…" : "Continue with Google"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
