import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeSpotifyLogin } from "@/lib/spotify";

export const Route = createFileRoute("/spotify-callback")({
  head: () => ({
    meta: [
      { title: "Connecting Spotify · Reson8" },
      { name: "description", content: "Finishing the secure Spotify connection for Reson8." },
      { property: "og:title", content: "Connecting Spotify · Reson8" },
      { property: "og:description", content: "Finishing the secure Spotify connection for Reson8." },
    ],
  }),
  component: SpotifyCallback,
});

function SpotifyCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const denied = params.get("error");
    if (denied) {
      setError("Spotify authorization was cancelled.");
      return;
    }
    if (!code) {
      setError("Missing authorization code.");
      return;
    }
    completeSpotifyLogin(code)
      .then(() => router.navigate({ to: "/settings" }))
      .catch((e: Error) => setError(e.message));
  }, [router]);

  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {error ? "Couldn't connect" : "Connecting to Spotify…"}
        </h1>
        <p className="mt-2 text-sm text-white/55">{error ?? "Exchanging your secure token."}</p>
      </div>
    </div>
  );
}
