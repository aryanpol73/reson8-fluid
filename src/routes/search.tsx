import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  Play,
  WifiOff,
  AlertTriangle,
  HardDrive,
  Globe2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCatalog, isTrackAvailableOffline, type Track } from "@/lib/mock-library";
import { usePlayer } from "@/store/player";
import {
  providerRegistry,
  RateLimitedError,
  NotConfiguredError,
  type TrackSource,
} from "@/lib/providers";
import { LikeButton, TrackMenu } from "@/components/track-menu";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · Reson8" },
      {
        name: "description",
        content: "Search local files and online streams across Audius and Jamendo on Reson8.",
      },
      { property: "og:title", content: "Search · Reson8" },
      {
        property: "og:description",
        content: "Ad-free music search across local and online libraries.",
      },
    ],
  }),
  component: SearchPage,
});

type FilterTab = "all" | "local" | "audius" | "jamendo";

function fmtDuration(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [onlineResults, setOnlineResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isJamendoConfigured, setIsJamendoConfigured] = useState(true);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const abortCtrlRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const playTrack = usePlayer((s) => s.playTrack);
  const { tracks: localCatalog } = useCatalog();

  // Monitor network connectivity changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check provider configurations
  useEffect(() => {
    const jamendo = providerRegistry.getProvider("jamendo");
    setIsJamendoConfigured(jamendo ? jamendo.isConfigured() : false);
  }, []);

  // Filter local library tracks based on current query
  const localResults = useMemo(() => {
    if (!q.trim()) return localCatalog.slice(0, 18);
    const needle = q.toLowerCase();
    return localCatalog.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.artist.toLowerCase().includes(needle) ||
        t.album?.toLowerCase().includes(needle),
    );
  }, [q, localCatalog]);

  // Execute online search across active providers with debounce and abort
  useEffect(() => {
    const trimmed = q.trim();

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }

    if (!trimmed || !isOnline || tab === "local") {
      setOnlineResults([]);
      setLoading(false);
      setErrorMsg(null);
      setIsRateLimited(false);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      setLoading(true);
      setErrorMsg(null);
      setIsRateLimited(false);

      try {
        let results: Track[] = [];

        if (tab === "audius") {
          const p = providerRegistry.getProvider("audius");
          if (p) results = (await p.searchTracks(trimmed, { signal: ctrl.signal })) as Track[];
        } else if (tab === "jamendo") {
          const p = providerRegistry.getProvider("jamendo");
          if (p) results = (await p.searchTracks(trimmed, { signal: ctrl.signal })) as Track[];
        } else {
          // "all" tab
          const searchOutcome = await providerRegistry.searchAll(trimmed, { signal: ctrl.signal });
          results = searchOutcome.results as Track[];

          // Check if any provider was rate limited
          const rateLimitErr = Object.values(searchOutcome.errors).find(
            (e) => e instanceof RateLimitedError,
          );
          if (rateLimitErr) {
            setIsRateLimited(true);
          }
        }

        if (!ctrl.signal.aborted) {
          setOnlineResults(results);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (ctrl.signal.aborted) return;
        setLoading(false);
        if (err instanceof RateLimitedError) {
          setIsRateLimited(true);
          setErrorMsg("Search rate limit exceeded. Please wait a moment before trying again.");
        } else if (err instanceof NotConfiguredError) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Could not complete online search. Check your network connection.");
        }
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
    };
  }, [q, tab, isOnline]);

  // Combine results according to active tab
  const displayedResults = useMemo(() => {
    if (tab === "local") {
      return localResults;
    }
    if (tab === "audius") {
      return onlineResults.filter((t) => t.source === "audius");
    }
    if (tab === "jamendo") {
      return onlineResults.filter((t) => t.source === "jamendo");
    }
    // "all": mix local matches with online results
    if (!q.trim()) return localResults;
    return [...localResults, ...onlineResults];
  }, [tab, localResults, onlineResults, q]);

  const handleClear = () => {
    setQ("");
    setOnlineResults([]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Search Header and Input */}
      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <label htmlFor="search-input" className="sr-only">
            Search music
          </label>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 pointer-events-none" />
          <input
            id="search-input"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracks, artists, local library, Audius, Jamendo…"
            className="w-full rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 outline-none pl-12 pr-12 py-3.5 text-sm md:text-base text-white placeholder:text-white/40 shadow-xl transition-all"
          />
          {q && (
            <button
              onClick={handleClear}
              aria-label="Clear search query"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Search filter tabs"
        >
          {[
            { id: "all", label: "All Sources" },
            { id: "local", label: "My Library (Local)", icon: HardDrive },
            { id: "audius", label: "Audius (Online)", icon: Globe2 },
            { id: "jamendo", label: "Jamendo (Online)", icon: Globe2 },
          ].map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id as FilterTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-cyan-500/30 to-blue-600/30 border border-cyan-400/40 text-cyan-200 shadow-lg shadow-cyan-950/40"
                    : "bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
                {item.id === "jamendo" && !isJamendoConfigured && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-400"
                    title="Missing configuration"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offline Notice Banner */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs md:text-sm flex items-center gap-3"
        >
          <WifiOff className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <strong>Offline Mode:</strong> Internet connection is unavailable. Online searches
            (Audius & Jamendo) are paused. Your local library search remains 100% active.
          </div>
        </motion.div>
      )}

      {/* Jamendo Configuration Notice if selected and unconfigured */}
      {tab === "jamendo" && !isJamendoConfigured && (
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs md:text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">Jamendo Client ID Not Configured</div>
            <p className="text-white/70">
              To search and stream licensed Creative Commons music from Jamendo, register an
              application at{" "}
              <a
                href="https://devportal.jamendo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-cyan-300"
              >
                devportal.jamendo.com
              </a>{" "}
              and add{" "}
              <code className="bg-black/30 px-1 py-0.5 rounded text-white">
                VITE_JAMENDO_CLIENT_ID
              </code>{" "}
              to your <code className="bg-black/30 px-1 py-0.5 rounded text-white">.env</code> file.
            </p>
          </div>
        </div>
      )}

      {/* Error or Rate Limit Alert */}
      {errorMsg && (
        <div className="rounded-xl p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs md:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setQ((prev) => `${prev} `)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-white/50 border-b border-white/10 pb-2">
        <span>
          {q.trim()
            ? `Found ${displayedResults.length} tracks`
            : tab === "local"
              ? "Your Local & Imported Library"
              : "Browse Library"}
        </span>
        {loading && (
          <span className="flex items-center gap-1.5 text-cyan-400 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" /> Searching online providers…
          </span>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-2">
        {displayedResults.map((t, idx) => {
          const isLocal = t.source === "local";
          const isOfflineAllowed = isTrackAvailableOffline(t);
          const isPlayableNow = isOnline || isOfflineAllowed;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.25 }}
              className={`group flex items-center gap-3 md:gap-4 p-2.5 rounded-xl border border-white/[0.06] hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.06] transition-all ${
                !isPlayableNow ? "opacity-50" : ""
              }`}
            >
              {/* Artwork & Play Button */}
              <div className="relative shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                <img
                  src={t.cover || t.artworkUrl}
                  alt={t.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={() => playTrack(t, displayedResults)}
                  disabled={!isPlayableNow}
                  aria-label={`Play ${t.title}`}
                  className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:pointer-events-none"
                >
                  <div className="h-8 w-8 rounded-full bg-cyan-400 text-black grid place-items-center shadow-lg">
                    <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                  </div>
                </button>
              </div>

              {/* Title, Artist, & Album */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm md:text-base font-medium text-white group-hover:text-cyan-200 transition-colors">
                    {t.title}
                  </span>
                  {/* Source Badge */}
                  {isLocal ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      <HardDrive className="h-2.5 w-2.5" /> On device
                    </span>
                  ) : t.source === "audius" ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 border border-purple-500/30 text-purple-300">
                      <Globe2 className="h-2.5 w-2.5" /> Audius · Stream
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      <Globe2 className="h-2.5 w-2.5" /> Jamendo · Stream
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-white/50 truncate mt-0.5">
                  <span className="truncate">{t.artist}</span>
                  {t.album && (
                    <>
                      <span>•</span>
                      <span className="truncate hidden sm:inline">{t.album}</span>
                    </>
                  )}
                </div>

                {/* Attribution & License Link */}
                {(t.license?.name || t.sourceUrl) && (
                  <div className="flex items-center gap-2 text-[11px] text-white/40 mt-1">
                    {t.license?.name && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-cyan-400/70" />
                        {t.license.url ? (
                          <a
                            href={t.license.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-white/60"
                          >
                            {t.license.name}
                          </a>
                        ) : (
                          t.license.name
                        )}
                      </span>
                    )}
                    {t.sourceUrl && (
                      <a
                        href={t.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-white/40 hover:text-white/80 transition-colors"
                        title="View original track page on provider"
                      >
                        <span>Provider page</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="hidden sm:block text-xs tabular-nums text-white/45 px-2">
                {fmtDuration(t.duration)}
              </div>

              {/* Actions: Like and Track Menu */}
              <div className="flex items-center gap-1 shrink-0">
                <LikeButton track={t} className="h-8 w-8" />
                <TrackMenu track={t} />
              </div>
            </motion.div>
          );
        })}

        {displayedResults.length === 0 && !loading && (
          <div className="rounded-2xl p-12 text-center border border-white/10 bg-white/[0.02]">
            <SearchIcon className="h-8 w-8 mx-auto text-white/30 mb-3" />
            <h3 className="text-base font-semibold text-white">No tracks found</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto mt-1">
              {q.trim()
                ? `No music matched "${q}". Try searching for a different title, artist, or switch tabs.`
                : "Type in the search bar above to search across local audio and online streaming providers."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
