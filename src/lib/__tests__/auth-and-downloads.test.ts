import { describe, it, expect, beforeEach } from "vitest";
import { useAuth } from "@/store/auth";

describe("Google Auth and Per-User Isolation", () => {
  beforeEach(() => {
    useAuth.setState({
      currentUser: null,
      savedAccounts: [],
      isAuthDialogOpen: false,
    });
  });

  it("signs in with Google account and isolates profile", () => {
    const acc = useAuth.getState().signInWithGoogle({
      id: "google_10928374",
      name: "John Doe",
      email: "john.doe@gmail.com",
      avatar: "https://lh3.googleusercontent.com/a/mock",
      musicTaste: "Chill Lo-Fi & Beats",
    });

    expect(acc.name).toBe("John Doe");
    expect(acc.email).toBe("john.doe@gmail.com");
    expect(acc.provider).toBe("google");
    expect(acc.musicTaste).toBe("Chill Lo-Fi & Beats");
    expect(useAuth.getState().currentUser?.id).toBe(acc.id);
  });

  it("supports recording downloads per user account", () => {
    const acc = useAuth.getState().signInWithGoogle({
      name: "Test User",
      email: "test@gmail.com",
    });

    useAuth.getState().recordDownloadedTrack("track-101");
    useAuth.getState().recordDownloadedTrack("track-102");

    const current = useAuth.getState().currentUser;
    expect(current?.downloadedTrackIds).toContain("track-101");
    expect(current?.downloadedTrackIds).toContain("track-102");
    expect(current?.downloadedTrackIds.length).toBe(2);
  });

  it("supports switching between different Google user accounts", () => {
    const userA = useAuth.getState().signInWithGoogle({
      id: "user_a",
      name: "Alex",
      email: "alex@gmail.com",
      musicTaste: "Chill Lo-Fi & Beats",
    });

    const userB = useAuth.getState().signInWithGoogle({
      id: "user_b",
      name: "Sarah",
      email: "sarah@gmail.com",
      musicTaste: "Synthwave & Electronic",
    });

    expect(useAuth.getState().currentUser?.id).toBe(userB.id);

    useAuth.getState().switchAccount(userA.id);
    expect(useAuth.getState().currentUser?.id).toBe(userA.id);
    expect(useAuth.getState().currentUser?.musicTaste).toBe("Chill Lo-Fi & Beats");
  });
});
