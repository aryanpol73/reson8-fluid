// src/lib/__tests__/local-music-db.test.ts
import { describe, it, expect } from "vitest";
import {
  cleanFilenameToTrackInfo,
  generateDeterministicCover,
  SUPPORTED_EXT,
} from "../local-music-db";

describe("Local Music DB - Filename Cleaning & Extraction", () => {
  it("extracts track number, artist, and title from standard naming conventions", () => {
    const res1 = cleanFilenameToTrackInfo("01 - Daft Punk - One More Time.mp3");
    expect(res1.trackNumber).toBe(1);
    expect(res1.artist).toBe("Daft Punk");
    expect(res1.title).toBe("One More Time");

    const res2 = cleanFilenameToTrackInfo("12. Pink Floyd - Comfortably Numb.flac");
    expect(res2.trackNumber).toBe(12);
    expect(res2.artist).toBe("Pink Floyd");
    expect(res2.title).toBe("Comfortably Numb");
  });

  it("handles filenames without track numbers", () => {
    const res = cleanFilenameToTrackInfo("Radiohead - Creep.m4a");
    expect(res.trackNumber).toBeUndefined();
    expect(res.artist).toBe("Radiohead");
    expect(res.title).toBe("Creep");
  });

  it("handles filenames without artist separators gracefully", () => {
    const res = cleanFilenameToTrackInfo("MidnightCity.mp3");
    expect(res.artist).toBe("Unknown Artist");
    expect(res.title).toBe("MidnightCity");
  });

  it("identifies supported audio extensions", () => {
    expect(SUPPORTED_EXT.test("song.mp3")).toBe(true);
    expect(SUPPORTED_EXT.test("track.flac")).toBe(true);
    expect(SUPPORTED_EXT.test("audio.m4a")).toBe(true);
    expect(SUPPORTED_EXT.test("music.wav")).toBe(true);
    expect(SUPPORTED_EXT.test("sound.ogg")).toBe(true);
    expect(SUPPORTED_EXT.test("voice.opus")).toBe(true);
    expect(SUPPORTED_EXT.test("image.jpg")).toBe(false);
    expect(SUPPORTED_EXT.test("document.pdf")).toBe(false);
  });
});

describe("Local Music DB - Deterministic Cover Art Generation", () => {
  it("generates valid SVG data URLs offline without network calls", () => {
    const cover = generateDeterministicCover("Daft Punk - Discovery - One More Time");
    expect(cover.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(cover)).toContain("<svg");
    expect(decodeURIComponent(cover)).toContain("</svg>");
  });

  it("produces identical artwork for the same seed string", () => {
    const cover1 = generateDeterministicCover("Coldplay - Parachutes - Yellow");
    const cover2 = generateDeterministicCover("Coldplay - Parachutes - Yellow");
    expect(cover1).toBe(cover2);
  });
});
