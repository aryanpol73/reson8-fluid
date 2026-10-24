import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/google-callback")({
  head: () => ({
    meta: [
      { title: "Signing in with Google · Reson8" },
      { name: "description", content: "Completing secure Google OAuth sign-in for Reson8." },
    ],
  }),
  component: GoogleCallback,
});

function GoogleCallback() {
  const router = useRouter();
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const [status, setStatus] = useState("Verifying Google authorization…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeAuth() {
      try {
        // 1. Google OAuth implicit token flow passes tokens in the URL hash fragment (#access_token=...)
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search);

        const denied = searchParams.get("error") || hashParams.get("error");
        if (denied) {
          setError(`Google authorization was cancelled or denied: ${denied}`);
          return;
        }

        const accessToken = hashParams.get("access_token") || searchParams.get("access_token");

        if (!accessToken) {
          const code = searchParams.get("code");
          if (code) {
            setError(
              "Authorization code received. For client-side Single Page and PWA apps, Reson8 uses token response. Please ensure your Google sign-in requested token response.",
            );
            return;
          }
          setError("No authentication token received from Google.");
          return;
        }

        setStatus("Fetching your verified Google profile…");
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to load Google profile (HTTP ${res.status})`);
        }

        const info = await res.json();
        if (!info.email) {
          throw new Error("Google did not return an email address.");
        }

        const pendingTaste = (typeof localStorage !== "undefined"
          ? (localStorage.getItem("reson8-pending-vibe") as any)
          : null) || undefined;

        const account = signInWithGoogle({
          id: `google_${info.sub}`,
          name: info.name || info.email.split("@")[0],
          email: info.email,
          avatar: info.picture,
          musicTaste: pendingTaste,
        });

        toast.success(`Welcome to Reson8, ${account.name}!`);
        router.navigate({ to: "/" });
      } catch (err) {
        console.error("Google OAuth error:", err);
        setError((err as Error).message || "An unknown error occurred during sign-in.");
      }
    }

    completeAuth();
  }, [router, signInWithGoogle]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-white">
      {error ? (
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-950/20 p-8 backdrop-blur-2xl">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-red-400">Google Sign-in Failed</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/60">{error}</p>
          <div className="mt-6">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Back to Sign In
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-cyan-500/30 blur-lg animate-pulse" />
            <img
              src="/icon-512.png"
              alt="Reson8 Logo"
              className="relative h-16 w-16 rounded-2xl object-cover ring-1 ring-white/20"
            />
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm font-medium text-white/70">{status}</p>
        </div>
      )}
    </div>
  );
}
