# 🏋️ GymApp

A mobile-first workout tracker as a single HTML file — no installation, no account, no server needed. Designed to run directly in Safari on iPhone and can be added to the home screen as a standalone app.

## Features

- **Multiple training plans** — create, edit, rename and delete plans
- **Phases** — organize exercises into phases (e.g. Warm Up, Strength, Cool Down)
- **Exercise library** — define global exercises once and reuse them across plans
- **Two exercise types** — sets/reps or time-based (with countdown timer)
- **Live workout tracking** — check off sets, rest timer between sets, stopwatch per set
- **Workout history** — every finished workout is saved with full exercise details
- **Export & Import** — back up all your data as a `.json` file and restore it anytime
- **German & English** — switch language in settings
- **100% offline** — all data is stored locally in the browser (`localStorage`)

## Usage

1. Download `trainingsplan.html`
2. Open the file in **Safari** on your iPhone
3. Tap the share icon → **"Add to Home Screen"**
4. The app opens like a native app — no address bar, full screen

## Data

All data (plans, exercises, history, settings) is saved automatically in your browser's local storage. Use the **Export** function in Settings → General to save a backup `.json` file. You can import it again at any time.

## Tech

Plain HTML, CSS and JavaScript — no frameworks, no dependencies, no build step. The entire app is a single `.html` file (~1600 lines).
