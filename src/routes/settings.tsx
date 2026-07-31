import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Moon,
  Sun,
  MonitorSmartphone,
  Palette,
  WifiOff,
  Trash2,
  Music2,
  Sparkles,
  Gauge,
  Link2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings, useSettingsHydrated, ACCENTS, type ThemeMode } from "@/store/settings";
import { useLibrary } from "@/store/library";
import { getTrack } from "@/lib/mock-library";
import { clearOfflineCaches, estimateOfflineUsage, prefetchForOffline } from "@/lib/pwa";
import {
  beginSpotifyLogin,
  disconnectSpotify,
  fetchSpotifyPlaylists,
  fetchSpotifyProfile,
  getClientId,
  getToken,
  redirectUri,
  setClientId,
  type SpotifyPlaylistSummary,
  type SpotifyProfile,
} from "@/lib/spotify";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Reson8" },
      {
        name: "description",
        content:
          "Tune Reson8: light or dark theme, accent colors, playback, offline caching and Spotify sync.",
      },
      { property: "og:title", content: "Settings · Reson8" },
      {
        property: "og:description",
        content: "Theme, playback, offline caching and Spotify sync controls for Reson8.",
      },
    ],
  }),
  component: SettingsPage,
});

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-5 md:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </motion.section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-white/45">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const themes: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: MonitorSmartphone },
];

function SettingsPage() {
  const hydrated = useSettingsHydrated();
  const s = useSettings();
  const recent = useLibrary((st) => st.recent);
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    void estimateOfflineUsage().then(setUsage);
  }, []);

  const refreshUsage = () => void estimateOfflineUsage().then(setUsage);

  const cacheNow = async () => {
    const covers = recent
      .map(getTrack)
      .map((t) => t?.cover)
      .filter((c): c is string => Boolean(c));
    await prefetchForOffline(covers);
    refreshUsage();
    toast.success("Cached your recent artwork for offline use");
  };

  if (!hydrated) return <div className="h-40" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Preferences</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Section icon={Palette} title="Appearance" subtitle="Theme, accent and density">
        <Row label="Theme" hint="Light mode keeps the fluid glass look">
          <div className="flex gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/10">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = s.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => s.set("theme", t.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                    active ? "bg-white/15 text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Accent" hint="Tints gradients, sliders and glow">
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => s.set("accent", a.id)}
                aria-label={a.label}
                className={`h-7 w-7 rounded-full ring-2 transition-transform hover:scale-110 ${
                  s.accent === a.id ? "ring-white" : "ring-white/20"
                }`}
                style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
              />
            ))}
          </div>
        </Row>

        <Row label="Compact rows" hint="Tighter track lists">
          <Switch checked={s.compactRows} onCheckedChange={(v) => s.set("compactRows", v)} />
        </Row>
      </Section>

      <Section icon={Sparkles} title="Ambient canvas" subtitle="The living background">
        <Row label="Audio reactive" hint="Ripples pulse with the music">
          <Switch checked={s.audioReactive} onCheckedChange={(v) => s.set("audioReactive", v)} />
        </Row>
        <div>
          <Row label="Intensity" hint={`${Math.round(s.ambientIntensity * 100)}%`}>
            <span />
          </Row>
          <Slider
            className="mt-2"
            value={[s.ambientIntensity * 100]}
            max={100}
            step={5}
            onValueChange={([v]) => s.set("ambientIntensity", (v ?? 0) / 100)}
          />
        </div>
        <Row label="Reduce motion" hint="Calms animations across the app">
          <Switch checked={s.reducedMotion} onCheckedChange={(v) => s.set("reducedMotion", v)} />
        </Row>
      </Section>

      <Section icon={Music2} title="Playback" subtitle="How tracks flow together">
        <Row label="Autoplay similar" hint="Keep playing when the queue ends">
          <Switch
            checked={s.autoplaySimilar}
            onCheckedChange={(v) => s.set("autoplaySimilar", v)}
          />
        </Row>
        <div>
          <Row
            label="Crossfade"
            hint={s.crossfade === 0 ? "Off" : `${s.crossfade}s between tracks`}
          >
            <span />
          </Row>
          <Slider
            className="mt-2"
            value={[s.crossfade]}
            max={12}
            step={1}
            onValueChange={([v]) => s.set("crossfade", v ?? 0)}
          />
        </div>
        <Row label="Volume normalization" hint="Even loudness across tracks">
          <Switch
            checked={s.normalizeVolume}
            onCheckedChange={(v) => s.set("normalizeVolume", v)}
          />
        </Row>
        <Row label="Show equalizer bars" hint="Animated indicator on playing rows">
          <Switch checked={s.showEqualizer} onCheckedChange={(v) => s.set("showEqualizer", v)} />
        </Row>
      </Section>

      <Section icon={WifiOff} title="Offline" subtitle="Keep the player usable without a network">
        <Row
          label="Offline mode"
          hint="Caches the app shell, last-opened playlists and album art"
        >
          <Switch checked={s.offlineMode} onCheckedChange={(v) => s.set("offlineMode", v)} />
        </Row>
        <Row label="Data saver" hint="Lower-resolution artwork on mobile data">
          <Switch checked={s.dataSaver} onCheckedChange={(v) => s.set("dataSaver", v)} />
        </Row>
        <Row
          label="Cached data"
          hint={usage === null ? "Measuring…" : `${(usage / 1024 / 1024).toFixed(1)} MB stored`}
        >
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={cacheNow}>
              <Gauge className="h-4 w-4" /> Cache now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await clearOfflineCaches();
                refreshUsage();
                toast.success("Offline cache cleared");
              }}
            >
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>
        </Row>
        <p className="text-[11px] leading-relaxed text-white/40">
          Offline caching activates on the published app — browser previews intentionally skip
          service workers so you always see the latest build.
        </p>
      </Section>

      <SpotifySection />

      <div className="pb-4">
        <Button
          variant="ghost"
          onClick={() => {
            s.reset();
            toast.success("Settings restored to defaults");
          }}
        >
          <RefreshCw className="h-4 w-4" /> Reset all settings
        </Button>
      </div>
    </div>
  );
}

function SpotifySection() {
  const [clientId, setId] = useState("");
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setId(getClientId());
    if (!getToken()) return;
    setLoading(true);
    Promise.all([fetchSpotifyProfile(), fetchSpotifyPlaylists()])
      .then(([p, pl]) => {
        setProfile(p);
        setPlaylists(pl.items ?? []);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const connected = Boolean(profile);

  return (
    <Section
      icon={Link2}
      title="Spotify"
      subtitle="Sync your playlists and library metadata"
    >
      {connected ? (
        <>
          <Row
            label={profile?.display_name ?? "Connected"}
            hint={profile?.email ?? "Spotify account linked"}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                disconnectSpotify();
                setProfile(null);
                setPlaylists([]);
                toast.success("Disconnected from Spotify");
              }}
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </Button>
          </Row>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {playlists.map((p) => (
              <div key={p.id} className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                {p.images?.[0]?.url && (
                  <img
                    src={p.images[0].url}
                    alt={p.name}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <div className="mt-2 truncate text-xs font-medium">{p.name}</div>
                <div className="text-[10px] text-white/45">{p.tracks?.total ?? 0} tracks</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-white/55">
            Create an app at developer.spotify.com, add{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[11px]">{redirectUri()}</code> as
            a Redirect URI, then paste the Client ID below. Nothing leaves your device — the login
            uses PKCE.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={clientId}
              onChange={(e) => setId(e.target.value)}
              placeholder="Spotify Client ID"
              className="bg-white/5"
            />
            <Button
              disabled={loading}
              onClick={async () => {
                try {
                  setClientId(clientId);
                  await beginSpotifyLogin();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Connect Spotify
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}
