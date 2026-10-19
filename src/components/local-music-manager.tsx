// src/components/local-music-manager.tsx
import { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  FileAudio,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Trash2,
  Sparkles,
  Search,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  pickAndScanDirectory,
  processAudioFiles,
  supportsDirectoryPicker,
  clearAllLocalTracks,
  saveImportedPlaylist,
  type ScanProgress,
  type StoredLocalTrack,
} from "@/lib/local-music-db";
import {
  parseSpotifyExportFile,
  matchPlaylistToLibrary,
  type PlaylistMatchSummary,
} from "@/lib/spotify-matcher";
import {
  refreshCatalogFromIndexedDB,
  tracks,
  getPlaylistTracks,
  coverForSeed,
  useCatalog,
} from "@/lib/mock-library";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";

export function LocalMusicManager() {
  const [localTracks, setLocalTracks] = useState<StoredLocalTrack[]>([]);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [matchSummaries, setMatchSummaries] = useState<PlaylistMatchSummary[]>([]);
  const [manualSearch, setManualSearch] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const spotifyFileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setQueue = usePlayer((s) => s.setQueue);
  const { hasUserLibrary } = useCatalog();

  const syncCatalog = async () => {
    const { localTracks: loaded } = await refreshCatalogFromIndexedDB();
    setLocalTracks(loaded);
  };

  useEffect(() => {
    void syncCatalog();
  }, []);

  const handleScanDirectory = async () => {
    try {
      setIsScanning(true);
      abortRef.current = new AbortController();
      const imported = await pickAndScanDirectory(setScanProgress, abortRef.current.signal);
      await syncCatalog();
      toast.success(`Imported ${imported.length} local audio tracks`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error((e as Error).message || "Folder scan cancelled or unsupported.");
      }
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    try {
      setIsScanning(true);
      abortRef.current = new AbortController();
      const entries = Array.from(fileList).map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
      }));
      const imported = await processAudioFiles(entries, setScanProgress, abortRef.current.signal);
      await syncCatalog();
      toast.success(`Added ${imported.length} audio files to your offline library`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      e.target.value = "";
    }
  };

  const handleSpotifyFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const allSummaries: PlaylistMatchSummary[] = [];
      const catalog = localTracks.length > 0 ? localTracks : tracks;

      for (const file of Array.from(files)) {
        const text = await file.text();
        const parsedPlaylists = parseSpotifyExportFile(text, file.name);
        for (const pl of parsedPlaylists) {
          const summary = matchPlaylistToLibrary(pl, catalog);
          allSummaries.push(summary);
        }
      }

      setMatchSummaries(allSummaries);
      toast.success(
        `Parsed ${allSummaries.length} playlist(s). Review match scores below to reconstruct!`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Invalid Spotify JSON or CSV file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleOverrideMatch = (summaryIdx: number, rowIdx: number, trackId: string) => {
    const chosen = (localTracks.length > 0 ? localTracks : tracks).find((t) => t.id === trackId);
    if (!chosen) return;

    setMatchSummaries((prev) =>
      prev.map((sum, sIdx) => {
        if (sIdx !== summaryIdx) return sum;
        const nextResults = sum.results.map((r, rIdx) =>
          rIdx === rowIdx
            ? {
                ...r,
                candidate: chosen,
                score: 100,
                status: "matched" as const,
                reasons: ["Manual selection"],
              }
            : r,
        );
        return {
          ...sum,
          results: nextResults,
          matchedCount: nextResults.filter((r) => r.status === "matched").length,
          reviewCount: nextResults.filter((r) => r.status === "needs_review").length,
          missingCount: nextResults.filter((r) => r.status === "missing").length,
        };
      }),
    );
  };

  const handleReconstructPlaylist = async (summary: PlaylistMatchSummary) => {
    const matchedTrackIds = summary.results
      .filter((r) => r.candidate && (r.status === "matched" || r.status === "needs_review"))
      .map((r) => r.candidate!.id);

    if (matchedTrackIds.length === 0) {
      toast.error(
        "No matched local tracks in this playlist yet. Import your local audio files first.",
      );
      return;
    }

    const firstCover =
      summary.results.find((r) => r.candidate?.cover)?.candidate?.cover ||
      coverForSeed(summary.playlistName);

    const newPlaylist = {
      id: summary.playlistId,
      name: summary.playlistName,
      description: `${summary.description || "Reconstructed playlist"} · ${matchedTrackIds.length}/${summary.results.length} matched locally`,
      cover: firstCover,
      trackIds: matchedTrackIds,
    };

    // Save to IndexedDB
    await saveImportedPlaylist(newPlaylist);

    // Add to Zustand useLibrary store with duplicate prevention
    const currentPlaylists = useLibrary.getState().playlists;
    const exists = currentPlaylists.some((p) => p.id === newPlaylist.id);
    if (!exists) {
      useLibrary.setState({
        playlists: [
          {
            id: newPlaylist.id,
            name: newPlaylist.name,
            description: newPlaylist.description,
            cover: newPlaylist.cover,
            trackIds: newPlaylist.trackIds,
            createdAt: Date.now(),
          },
          ...currentPlaylists,
        ],
      });
    }

    await syncCatalog();
    setQueue(getPlaylistTracks(newPlaylist.id));
    toast.success(
      `Reconstructed "${newPlaylist.name}" (${matchedTrackIds.length} tracks) and started playback!`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Local Music Library Section */}
      <section className="glass-panel p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <FolderOpen className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Local Music Library</h2>
              <p className="text-xs text-white/50">
                Scan music folders or pick audio files (MP3, FLAC, M4A, AAC, WAV, OGG) for 100%
                offline playback
              </p>
            </div>
          </div>
          {localTracks.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setQueue(localTracks)}>
              <Play className="h-3.5 w-3.5 mr-1" /> Play All ({localTracks.length})
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.flac,.m4a,.aac,.wav,.ogg,.opus"
          className="hidden"
          onChange={handleFilesSelected}
        />

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {supportsDirectoryPicker() && (
            <Button size="sm" onClick={handleScanDirectory} disabled={isScanning}>
              <FolderOpen className="h-4 w-4 mr-1.5" />
              Scan Music Folder
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
          >
            <FileAudio className="h-4 w-4 mr-1.5" />
            Select Audio Files
          </Button>
          {isScanning && (
            <Button size="sm" variant="ghost" onClick={() => abortRef.current?.abort()}>
              Cancel Scan
            </Button>
          )}
          {localTracks.length > 0 && !isScanning && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (
                  window.confirm("Clear all imported local tracks and playlists from IndexedDB?")
                ) {
                  await clearAllLocalTracks();
                  await syncCatalog();
                  toast("Cleared local music database");
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1 text-red-400" /> Clear Local Library
            </Button>
          )}
        </div>

        {scanProgress && (
          <div className="mt-4 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10 text-xs space-y-2">
            <div className="flex justify-between text-white/80">
              <span className="truncate max-w-[70%]">{scanProgress.currentFile}</span>
              <span className="tabular-nums font-mono">
                {scanProgress.processed} / {scanProgress.discovered}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-cyan-400 transition-all duration-200"
                style={{
                  width: `${
                    scanProgress.discovered > 0
                      ? Math.round((scanProgress.processed / scanProgress.discovered) * 100)
                      : 10
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 text-[11px] text-white/50 space-y-1">
          <p>
            {hasUserLibrary
              ? `${localTracks.length} local tracks indexed in IndexedDB. Your Home, Library, Albums, and Artists views are displaying your offline collection.`
              : "No local files imported yet. Select your music folder or files above to replace the demo tracks with your own collection."}
          </p>
          <p className="text-white/35">
            Privacy: Audio files and metadata are parsed locally inside your browser and stored in
            client-side IndexedDB. No files are uploaded to any server.
          </p>
        </div>
      </section>

      {/* Spotify Offline JSON / CSV Importer + Smart Matcher */}
      <section className="glass-panel p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Spotify Playlist Importer & Smart Matcher
            </h2>
            <p className="text-xs text-white/50">
              Reconstruct playlists from Spotify JSON or Exportify CSV files without needing Spotify
              OAuth
            </p>
          </div>
        </div>

        <input
          ref={spotifyFileRef}
          type="file"
          multiple
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={handleSpotifyFileImport}
        />

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button size="sm" onClick={() => spotifyFileRef.current?.click()}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Import Spotify JSON / CSV
          </Button>
        </div>

        {matchSummaries.length > 0 && (
          <div className="mt-5 space-y-5">
            {matchSummaries.map((sum, sIdx) => {
              const pct =
                sum.results.length > 0
                  ? Math.round(((sum.matchedCount + sum.reviewCount) / sum.results.length) * 100)
                  : 0;

              return (
                <div
                  key={sum.playlistId}
                  className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{sum.playlistName}</h3>
                      <p className="text-xs text-white/50">
                        {sum.results.length} total · {sum.matchedCount} matched · {sum.reviewCount}{" "}
                        review · {sum.missingCount} missing ({pct}% coverage)
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleReconstructPlaylist(sum)}>
                      Reconstruct & Play Playlist
                    </Button>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {sum.results.map((r, rIdx) => {
                      const searchKey = sIdx * 10000 + rIdx;
                      const query = (manualSearch[searchKey] || "").toLowerCase();
                      const pool = localTracks.length > 0 ? localTracks : tracks;
                      const searchMatches = query
                        ? pool
                            .filter((t) =>
                              `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query),
                            )
                            .slice(0, 5)
                        : [];

                      return (
                        <div
                          key={`${r.imported.orderIndex}-${r.imported.title}`}
                          className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs ring-1 ring-white/5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">
                                {r.imported.orderIndex + 1}. {r.imported.title}{" "}
                                <span className="text-white/45">· {r.imported.artist}</span>
                              </div>
                              <div className="truncate text-[11px] text-white/45">
                                {r.candidate
                                  ? `Matched: ${r.candidate.title} — ${r.candidate.artist} (${r.reasons.join(", ")})`
                                  : "No automatic match found"}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {r.status === "matched" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 ring-1 ring-emerald-500/30">
                                  <CheckCircle2 className="h-3 w-3" /> {r.score}% Matched
                                </span>
                              )}
                              {r.status === "needs_review" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/30">
                                  <AlertTriangle className="h-3 w-3" /> {r.score}% Review
                                </span>
                              )}
                              {r.status === "missing" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-300 ring-1 ring-rose-500/30">
                                  <XCircle className="h-3 w-3" /> Missing
                                </span>
                              )}
                            </div>
                          </div>

                          {(r.status !== "matched" || query) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                              <div className="relative flex-1 min-w-[180px]">
                                <Search className="h-3 w-3 absolute left-2.5 top-2 text-white/40" />
                                <Input
                                  value={manualSearch[searchKey] || ""}
                                  onChange={(ev) =>
                                    setManualSearch((p) => ({
                                      ...p,
                                      [searchKey]: ev.target.value,
                                    }))
                                  }
                                  placeholder="Search local track to link manually..."
                                  className="h-7 pl-7 text-[11px] bg-white/5"
                                />
                              </div>
                              {(query ? searchMatches : r.alternatives.map((a) => a.track))
                                .slice(0, 3)
                                .map((cand) => (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    onClick={() => handleOverrideMatch(sIdx, rIdx, cand.id)}
                                    className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] truncate max-w-[200px] text-left"
                                  >
                                    Use: {cand.title} · {cand.artist}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
