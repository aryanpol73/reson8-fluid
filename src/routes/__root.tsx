import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { Sidebar } from "@/components/sidebar";
import { FloatingPlayer } from "@/components/floating-player";
import { AudioEngine } from "@/components/audio-engine";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { AppSettingsEffects } from "@/components/app-settings-effects";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-white">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-white">Page not found</h2>
        <p className="mt-2 text-sm text-white/60">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-white">This page didn't load</h1>
        <p className="mt-2 text-sm text-white/60">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0a0a0f" },
      { title: "Home · Reson8" },
      {
        name: "description",
        content:
          "Your daily mixes, recent plays, and made-for-you rotations on Reson8.",
      },
      { name: "author", content: "Reson8" },
      { property: "og:title", content: "Home · Reson8" },
      {
        property: "og:description",
        content: "Your daily mixes, recent plays, and made-for-you rotations on Reson8.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Home · Reson8" },
      { name: "twitter:description", content: "Your daily mixes, recent plays, and made-for-you rotations on Reson8." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d201c5b-d33b-4cd0-ab1e-82369aa6e255/id-preview-eb68294c--264f0676-d311-4b96-9276-93ec474033e8.lovable.app-1785260781325.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d201c5b-d33b-4cd0-ab1e-82369aa6e255/id-preview-eb68294c--264f0676-d311-4b96-9276-93ec474033e8.lovable.app-1785260781325.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/png",
        href: "/__l5e/assets-v1/83836326-e723-4b84-b815-a336f1503f00/reson8-logo.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/__l5e/assets-v1/83836326-e723-4b84-b815-a336f1503f00/reson8-logo.png",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppSettingsEffects />
      <AmbientCanvas />
      <AudioEngine />
      <div className="flex min-h-screen w-full text-white">
        <Sidebar />
        <main className="flex-1 min-w-0 p-3 pl-0 md:p-3 md:pl-0">
          <div className="glass-panel h-[calc(100vh-24px)] overflow-y-auto px-5 pt-5 pb-52 md:px-8 md:pt-8">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingPlayer />
      <MobileNav />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
