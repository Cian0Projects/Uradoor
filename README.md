# Uradoor

Interval timer for run training. Built-in presets (Tabata, EMOM, 5×400m, 3×(5×400m)) plus a custom workout builder. Runs in the browser, installable as a PWA, deploys to GitHub Pages.

## Why

When you're doing structured run sessions (e.g. `3 sets × 5 × 400m` with `90s` rep rest and `3min` set rest), tracking the rest periods in your head while gasping is the worst part of the workout. This app drives the rest clocks for you with audio + vibration cues. Distance reps are handled via a "manual finish" mode — tap to end the rep when you cross the line, and the rest timer kicks in immediately.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run unit tests
npm run build    # production build
npm run preview  # serve the production build
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages. Enable Pages in the repo settings (Source: "GitHub Actions") on the first run.

The app is served from `https://<user>.github.io/Uradoor/` — `vite.config.ts` has `base: '/Uradoor/'` so asset URLs resolve under the subpath.

## Garmin (future)

Live two-way control of a Garmin watch from a web browser is not feasible — the watch doesn't expose a generic BLE control API. The realistic path is exporting a Garmin-compatible structured-workout `.FIT` file from the Builder and uploading it once to Garmin Connect, which syncs it to the watch. The data model already represents workouts structurally, so this slots in cleanly later.

## Layout

- `src/types.ts` — `Workout` + `Phase` model.
- `src/presets.ts` — built-in workouts.
- `src/storage.ts` — localStorage persistence for custom workouts.
- `src/timer/buildSchedule.ts` — pure function flattening a `Workout` into an ordered `Phase[]`.
- `src/timer/useTimer.ts` — runtime hook driving the active session.
- `src/audio/cues.ts` — WebAudio beeps + `navigator.vibrate`.
- `src/audio/wakeLock.ts` — Screen Wake Lock API wrapper.
- `src/screens/{Home,Builder,Run}.tsx` — the three screens.
