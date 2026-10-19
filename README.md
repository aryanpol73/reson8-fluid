# Reson8

Project: Build "Reson8", an ultra-premium, ad-free Progressive Web App (PWA) music player that serves as a next-generation Spotify alternative. The UX/UI must surpass Spotify with dynamic glassmorphism, fluid animations, dynamic color-shifting, and zero visual clutter.

App Name & Branding:

- Name: Reson8

- Tagline: Infinite Sound, Fluid Design.

Tech Stack & Libraries:

- React (Vite)

- Tailwind CSS (Dark mode default, deep rich grays/purples like #0a0a0a, never harsh flat black)

- shadcn/ui (for sliders, dialogs, dropdowns, tooltips, and buttons)

- Framer Motion (for smooth page transitions, list staggering, and spring-physics micro-interactions)

- Zustand (for global audio player state, active queue, current track, and playlist memory)

- fast-average-color or ColorThief (to extract dominant colors from album art in real time)

- Lucide React (clean, consistent iconography)

Core Architecture & PWA Setup:

- Valid PWA manifest (standalone app view, customized dark theme-color, custom icon).

- Service worker for instant offline shell loading.

- Persistent global AudioContext / HTML5 Audio state managed via Zustand so music uninterruptedly plays across screen navigation.

Visuals & UI/UX (The "Better Than Spotify" Edge):

1. Ambient Color Canvas: The app background features a subtle, blurred mesh gradient that fluidly animates to match the dominant colors of the currently playing track's album art.

2. Glassmorphism Panels: The sidebar and bottom player use backdrop-blur filters so the ambient background colors softly bleed through.

3. Floating Glass Player: A floating, rounded, glassmorphic player at the bottom (not a rigid edge-to-edge block). Includes play/pause/skip, custom shadcn slider for seek/volume, track info, and a minimalist animated audio equalizer visualizer that activates when playing.

4. Dynamic Hover States: Album cards and track rows feature 3D scale-on-hover effects using Framer Motion.

Spotify API Sync & Audio Setup:

- "Connect with Spotify" OAuth flow via Spotify Web API.

- Sync and render the user's actual Spotify Playlists, "Liked Songs", and recent tracks.

- Tracklist view shows: #, Title, Artist, Album, Duration, and a hover-to-play button.

- Audio Strategy: Map the player to play Spotify's 30-second `preview_url` for initial testing, structured cleanly so audio backends (like YouTube/Invidious audio streams) can be swapped in seamlessly later.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://reson8-fluid-sound.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/264f0676-d311-4b96-9276-93ec474033e8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
