import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth, type MusicTaste } from "@/store/auth";
import { GoogleIcon } from "@/components/google-auth-dialog";
import { Sparkles, ShieldCheck, Headphones, Compass, Download } from "lucide-react";
import { toast } from "sonner";

const TASTES: MusicTaste[] = [
  "Chill Lo-Fi & Beats",
  "Synthwave & Electronic",
  "Acoustic & Indie Folk",
  "Upbeat Pop & Dance",
  "Deep Focus & Ambient",
];

const DEFAULT_CLIENT_ID = "394307846802-37i8ju1vt3r4a2ggohdm330gnjs85li6.apps.googleusercontent.com";

export function GoogleAuthGate() {
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const configuredClientId = useAuth((s) => s.googleClientId);
  const activeClientId = configuredClientId || DEFAULT_CLIENT_ID;

  const [selectedTaste, setSelectedTaste] = useState<MusicTaste>("Chill Lo-Fi & Beats");
  const [loading, setLoading] = useState(false);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
  const redirectUri = `${originUrl}/google-callback`;

  const handleGoogleSignIn = () => {
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

    // 1. Try Google Identity Services (GSI) Token Client popup
    if (win.google?.accounts?.oauth2) {
      try {
        setLoading(true);
        const client = win.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: "openid email profile",
          callback: async (resp) => {
            setLoading(false);
            if (resp.access_token) {
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                if (!res.ok) throw new Error(`Google UserInfo API error (HTTP ${res.status})`);
                const info = await res.json();
                const acc = signInWithGoogle({
                  id: `google_${info.sub}`,
                  name: info.name || info.email.split("@")[0] || "Google User",
                  email: info.email,
                  avatar: info.picture,
                  musicTaste: selectedTaste,
                });
                toast.success(`Welcome to Reson8, ${acc.name}!`);
              } catch (e) {
                toast.error("Failed to load Google profile: " + (e as Error).message);
              }
            } else if (resp.error) {
              toast.error("Google sign-in was cancelled or failed.");
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        setLoading(false);
        console.warn("Falling back to OAuth 2.0 direct redirect:", err);
      }
    }

    // 2. Direct OAuth 2.0 Redirect flow (fallback or standard redirect)
    setLoading(true);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      activeClientId,
    )}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=token&scope=openid%20email%20profile&prompt=select_account`;
    window.location.href = authUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060814]/95 backdrop-blur-2xl overflow-y-auto">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-500/20 via-purple-600/20 to-pink-500/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.04] p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-3xl text-white my-auto"
      >
        {/* Brand header with glowing neon 8 icon */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-60 blur-lg" />
            <img
              src="/icon-512.png"
              alt="Reson8 Logo"
              className="relative h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 shadow-2xl"
            />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 ring-1 ring-white/15 mb-2">
            <Sparkles className="h-3 w-3" /> Reson8 PWA
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Feel the infinite.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              Live the sound.
            </span>
          </h1>
          <p className="mt-1 text-xs text-white/55 max-w-xs">
            Sign in with your Google account to unlock your personal music library, custom playlists, and offline downloads.
          </p>
        </div>

        {/* Music Taste Pre-Selector */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider flex items-center gap-1">
              <Compass className="h-3 w-3 text-cyan-400" /> Choose Your Music Vibe
            </span>
            <span className="text-[10px] text-white/40">Personalizes your stream</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {TASTES.map((taste) => (
              <button
                key={taste}
                type="button"
                onClick={() => setSelectedTaste(taste)}
                className={`text-xs px-2.5 py-2 rounded-lg border text-left truncate transition-all cursor-pointer ${
                  selectedTaste === taste
                    ? "bg-white/20 border-cyan-400/50 text-white font-semibold ring-1 ring-cyan-400/40 shadow-sm"
                    : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {taste.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Main Google Sign-In Button */}
        <div className="mt-6 space-y-4">
          <Button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium text-sm flex items-center justify-center gap-3 shadow-[0_4px_24px_-4px_rgba(255,255,255,0.4)] transition-all cursor-pointer rounded-xl"
          >
            <GoogleIcon className="h-5 w-5" />
            {loading ? "Connecting to Google…" : "Continue with Google"}
          </Button>

          {/* Security & Features Badges */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10 text-[10px] text-white/45">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Google OAuth 2.0
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3 text-cyan-400" /> Offline Downloads
            </span>
            <span className="flex items-center gap-1">
              <Headphones className="h-3 w-3 text-purple-400" /> Infinite Sound
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
