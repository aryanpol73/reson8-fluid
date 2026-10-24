import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth, type MusicTaste } from "@/store/auth";
import { GoogleIcon } from "@/components/google-auth-dialog";
import { Sparkles, ShieldCheck, Headphones, Compass, Download } from "lucide-react";
import { toast } from "sonner";

interface VibePreset {
  id: MusicTaste;
  label: string;
  sub: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    cardBorder: string;
    badgeBg: string;
    activeBg: string;
    textAccent: string;
    dotGlow: string;
  };
}

const VIBE_PRESETS: VibePreset[] = [
  {
    id: "Chill Lo-Fi & Beats",
    label: "Chill",
    sub: "Lo-Fi & Beats",
    colors: {
      primary: "#38bdf8", // soft cyan
      secondary: "#0284c7", // muted teal/blue
      accent: "#0ea5e9",
      glow: "rgba(56, 189, 248, 0.28)",
      cardBorder: "rgba(56, 189, 248, 0.35)",
      badgeBg: "rgba(56, 189, 248, 0.12)",
      activeBg: "linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(2, 132, 199, 0.15))",
      textAccent: "#7dd3fc",
      dotGlow: "#38bdf8",
    },
  },
  {
    id: "Synthwave & Electronic",
    label: "Synthwave",
    sub: "Neon Electronic",
    colors: {
      primary: "#f43f5e", // neon magenta
      secondary: "#a855f7", // electric purple
      accent: "#ec4899",
      glow: "rgba(236, 72, 153, 0.32)",
      cardBorder: "rgba(236, 72, 153, 0.4)",
      badgeBg: "rgba(236, 72, 153, 0.15)",
      activeBg: "linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(168, 85, 247, 0.2))",
      textAccent: "#f472b6",
      dotGlow: "#ec4899",
    },
  },
  {
    id: "Acoustic & Indie Folk",
    label: "Acoustic",
    sub: "Warm Indie",
    colors: {
      primary: "#f59e0b", // warm amber
      secondary: "#d97706", // muted orange
      accent: "#fbbf24",
      glow: "rgba(245, 158, 11, 0.25)",
      cardBorder: "rgba(245, 158, 11, 0.38)",
      badgeBg: "rgba(245, 158, 11, 0.12)",
      activeBg: "linear-gradient(135deg, rgba(245, 158, 11, 0.24), rgba(217, 119, 6, 0.15))",
      textAccent: "#fde68a",
      dotGlow: "#fbbf24",
    },
  },
  {
    id: "Upbeat Pop & Dance",
    label: "Upbeat",
    sub: "Pop & Dance",
    colors: {
      primary: "#06b6d4", // vibrant cyan
      secondary: "#f97316", // electric orange
      accent: "#3b82f6", // saturated blue
      glow: "rgba(6, 182, 212, 0.3)",
      cardBorder: "rgba(6, 182, 212, 0.4)",
      badgeBg: "rgba(6, 182, 212, 0.14)",
      activeBg: "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(249, 115, 22, 0.18))",
      textAccent: "#67e8f9",
      dotGlow: "#06b6d4",
    },
  },
  {
    id: "Deep Focus & Ambient",
    label: "Deep",
    sub: "Focus Ambient",
    colors: {
      primary: "#8b5cf6", // violet
      secondary: "#6366f1", // near-black indigo
      accent: "#a855f7", // electric purple
      glow: "rgba(139, 92, 246, 0.32)",
      cardBorder: "rgba(139, 92, 246, 0.42)",
      badgeBg: "rgba(139, 92, 246, 0.14)",
      activeBg: "linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(139, 92, 246, 0.22))",
      textAccent: "#c4b5fd",
      dotGlow: "#8b5cf6",
    },
  },
];

const DEFAULT_CLIENT_ID = "394307846802-37i8ju1vt3r4a2ggohdm330gnjs85li6.apps.googleusercontent.com";
const STORAGE_KEY = "reson8-pending-vibe";

export function GoogleAuthGate() {
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const configuredClientId = useAuth((s) => s.googleClientId);
  const activeClientId = configuredClientId || DEFAULT_CLIENT_ID;

  // Persist vibe preference across page refreshes via localStorage
  const [selectedTaste, setSelectedTaste] = useState<MusicTaste>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as MusicTaste | null;
      if (saved && VIBE_PRESETS.some((p) => p.id === saved)) return saved;
    }
    return "Chill Lo-Fi & Beats";
  });

  const [loading, setLoading] = useState(false);

  const activePreset =
    VIBE_PRESETS.find((p) => p.id === selectedTaste) || VIBE_PRESETS[0];

  const handleSelectVibe = (taste: MusicTaste) => {
    setSelectedTaste(taste);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, taste);
      }
    } catch {
      /* ignore */
    }
  };

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

    // Store selected vibe for callback pick up
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, selectedTaste);
      }
    } catch {
      /* ignore */
    }

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
      {/* Dynamic ambient backdrop glow tinted by the active vibe */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[420px] rounded-full blur-[130px] pointer-events-none transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(circle, ${activePreset.colors.glow} 0%, rgba(99, 102, 241, 0.12) 50%, transparent 80%)`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 backdrop-blur-3xl text-white my-auto transition-all duration-500 ease-out"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${activePreset.colors.cardBorder}`,
          boxShadow: `0 20px 60px -15px rgba(0,0,0,0.85), 0 0 45px -10px ${activePreset.colors.glow}`,
        }}
      >
        {/* Brand header with glowing neon 8 icon */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              className="absolute -inset-2 rounded-2xl opacity-70 blur-lg transition-all duration-500"
              style={{
                background: `linear-gradient(135deg, ${activePreset.colors.primary}, ${activePreset.colors.secondary})`,
              }}
            />
            <img
              src="/icon-512.png"
              alt="Reson8 Logo"
              className="relative h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 shadow-2xl"
            />
          </div>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1 transition-all duration-500 mb-2"
            style={{
              backgroundColor: activePreset.colors.badgeBg,
              color: activePreset.colors.textAccent,
              borderColor: activePreset.colors.cardBorder,
            }}
          >
            <Sparkles className="h-3 w-3" /> Reson8 PWA
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Feel the infinite.{" "}
            <span
              className="bg-clip-text text-transparent transition-all duration-500"
              style={{
                backgroundImage: `linear-gradient(135deg, ${activePreset.colors.primary}, ${activePreset.colors.secondary})`,
              }}
            >
              Live the sound.
            </span>
          </h1>
          <p className="mt-1 text-xs text-white/55 max-w-xs">
            Sign in with your Google account to unlock your personal music library, custom playlists, and offline downloads.
          </p>
        </div>

        {/* Music Vibe Selector with Color Presets & Micro-Animations */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 transition-colors duration-500"
              style={{ color: activePreset.colors.textAccent }}
            >
              <Compass className="h-3 w-3" /> Choose Your Music Vibe
            </span>
            <span className="text-[10px] text-white/40">Personalizes your stream</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {VIBE_PRESETS.map((preset) => {
              const isSelected = selectedTaste === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectVibe(preset.id)}
                  aria-pressed={isSelected}
                  className={`relative text-xs px-2.5 py-2 rounded-lg border text-left truncate transition-all duration-300 cursor-pointer group active:scale-[0.98] ${
                    isSelected
                      ? "text-white font-semibold shadow-sm"
                      : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                  }`}
                  style={
                    isSelected
                      ? {
                          background: preset.colors.activeBg,
                          borderColor: preset.colors.cardBorder,
                          boxShadow: `0 0 16px -2px ${preset.colors.glow}`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{preset.label}</span>
                    {isSelected && (
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse motion-reduce:animate-none"
                        style={{
                          backgroundColor: preset.colors.dotGlow,
                          boxShadow: `0 0 6px ${preset.colors.dotGlow}`,
                        }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Google Sign-In Button */}
        <div className="mt-6 space-y-4">
          <Button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium text-sm flex items-center justify-center gap-3 shadow-[0_4px_24px_-4px_rgba(255,255,255,0.4)] transition-all cursor-pointer rounded-xl active:scale-[0.99]"
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

