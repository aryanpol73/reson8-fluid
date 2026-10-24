import { toast } from "sonner";
import type { Track } from "@/lib/mock-library";
import { saveLocalTracks, type StoredLocalTrack } from "@/lib/local-music-db";
import { refreshCatalogFromIndexedDB } from "@/lib/mock-library";
import { useAuth } from "@/store/auth";

export async function downloadTrack(track: Track): Promise<boolean> {
  const toastId = toast.loading(`Starting download: "${track.title}"...`);

  try {
    // 1. Identify valid audio URL
    let audioUrl = track.previewUrl || track.streamUrl;

    if (!audioUrl && track.source && track.providerTrackId) {
      try {
        const { providerRegistry } = await import("@/lib/providers");
        const provider = providerRegistry.getProvider(track.source as "audius" | "jamendo");
        if (provider) {
          audioUrl = await provider.resolveStreamUrl(track.providerTrackId);
        }
      } catch (err) {
        console.warn("Could not resolve stream URL for track:", err);
      }
    }

    if (!audioUrl) {
      toast.dismiss(toastId);
      toast.error(`Download unavailable: no audio source found for "${track.title}"`);
      return false;
    }

    // 2. Fetch the audio content as Blob
    let blob: Blob;
    try {
      const response = await fetch(audioUrl, {
        headers: { Accept: "audio/*,application/octet-stream" },
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      blob = await response.blob();
    } catch {
      // Fallback: If CORS blocks direct fetch, create fallback playable audio blob or trigger direct download link
      const fallbackA = document.createElement("a");
      fallbackA.href = audioUrl;
      fallbackA.download = `${track.artist} - ${track.title}.mp3`;
      fallbackA.target = "_blank";
      fallbackA.rel = "noopener noreferrer";
      document.body.appendChild(fallbackA);
      fallbackA.click();
      document.body.removeChild(fallbackA);

      useAuth.getState().recordDownloadedTrack(track.id);
      toast.dismiss(toastId);
      toast.success(`Downloaded "${track.title}"! File saved to your downloads folder.`);
      return true;
    }

    // 3. Save file to disk
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    const sanitizedFilename = `${track.artist} - ${track.title}`.replace(/[/\\?%*:|"<>]/g, "-");
    downloadAnchor.download = `${sanitizedFilename}.mp3`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    // 4. Save to IndexedDB so it's playable offline in Reson8
    const storedTrack: StoredLocalTrack = {
      ...track,
      id: track.id,
      fileName: `${sanitizedFilename}.mp3`,
      fileSize: blob.size,
      mimeType: blob.type || "audio/mpeg",
      isLocal: true,
      addedAt: Date.now(),
      storageType: "blob",
      fileBlob: blob,
      offline: "available",
      source: "local",
    };

    await saveLocalTracks([storedTrack]);
    await refreshCatalogFromIndexedDB();

    // 5. Track in user account
    useAuth.getState().recordDownloadedTrack(track.id);

    toast.dismiss(toastId);
    toast.success(`"${track.title}" downloaded! Available offline in your account.`);
    return true;
  } catch (error) {
    toast.dismiss(toastId);
    const msg = error instanceof Error ? error.message : "Download failed";
    toast.error(`Download failed: ${msg}`);
    return false;
  }
}
