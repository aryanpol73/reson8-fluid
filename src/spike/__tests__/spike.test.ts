// src/spike/__tests__/spike.test.ts
import { describe, it, expect } from "vitest";

describe("Phase 0 Spike - Audius API & Browser Audio Capabilities", () => {
  it("fetches metadata and streams from Audius Discovery Node", async () => {
    const searchUrl =
      "https://discoveryprovider.audius.co/v1/tracks/search?query=ambient&app_name=reson8_spike";
    const res = await fetch(searchUrl);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { data?: { id: string; title: string; duration: number }[] };
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data!.length).toBeGreaterThan(0);

    const track = json.data![0];
    expect(track.id).toBeDefined();
    expect(track.title).toBeDefined();

    // Stream URL probing with browser Origin
    const streamUrl = `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=reson8_spike`;
    const streamRes = await fetch(streamUrl, {
      method: "GET",
      headers: {
        Origin: "http://localhost:5173",
        Range: "bytes=0-1023",
      },
    });
    expect(streamRes.status).toBeGreaterThanOrEqual(200);
    expect(streamRes.status).toBeLessThan(400);

    // Verify CORS header
    const cors = streamRes.headers.get("access-control-allow-origin");
    expect(cors === "*" || cors !== null).toBe(true);

    const arrayBuffer = await streamRes.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  }, 15000);

  it("creates a Blob from audio chunks and verifies URL creation", () => {
    const mockAudioData = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]); // MP3 sync word header
    const blob = new Blob([mockAudioData], { type: "audio/mpeg" });
    expect(blob.size).toBe(6);
    expect(blob.type).toBe("audio/mpeg");

    const objectUrl = URL.createObjectURL(blob);
    expect(objectUrl.startsWith("blob:")).toBe(true);
    URL.revokeObjectURL(objectUrl);
  });
});
