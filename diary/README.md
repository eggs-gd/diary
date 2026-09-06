# 觀明 · Attention Journal

Not a diary. Capture what catches your attention; come back later to see what happened, the
story you told yourself about it, and whether another reading is true.

The name 觀明 (Guān Míng) — _observe_ + _clarity_ — is a symbol, not a title or a literal
translation. Product concept and history: [`STORYBOARD.md`](STORYBOARD.md).

## Status

- **PWA — the primary platform.** [journal.eggs.gd](https://journal.eggs.gd).
- **iOS / Android** — Capacitor shells are built (`gd.eggs.diary`, 1.0.1). Design and
  product decisions are made **PWA-first**.

---

## What the app does

### Capture

One field, one save. "What happened", an optional resonance score, and an entry **type** —
**event** (something that happened) or **act** (something you did). Nothing forces you to
reflect right away; capture is the whole interaction.

### Event reflection

Return to a captured entry and work through four questions, phrased for the entry's
resonance (upsetting vs delightful):

1. what stirred you about it
2. what it says about you
3. what other perspectives exist
4. how you'll act next time

Plus a re-check of the resonance now that time has passed.

### Day reflection

One reflection per day: events grouped by what brought joy / what upset you / what you did
that helped / what you did that made things harder, then "what to change or keep doing",
free-form insights, and a day resonance.

### Calendar & export

A month/year calendar view over the archive. Export a period as a plain report or as
agent-ready instructions.

---

## Platform strategy

The PWA is the reference implementation. Native builds add platform integration, each with
a web fallback.

| Capability     | Native                                  | Web / PWA fallback               |
| -------------- | --------------------------------------- | -------------------------------- |
| Storage        | SQLite (`@capacitor-community/sqlite`)  | `localStorage`                   |
| Analytics      | `@capacitor-firebase/analytics`         | `firebase/analytics`             |
| Export / share | System share sheet                      | in-app preview → download / copy |
| Text size      | Dynamic Type via `@capacitor/text-zoom` | browser zoom                     |
| Share intake   | System share target                     | —                                |

Add features PWA-first, then layer the native path on top.

---

## Stack

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| Framework       | SvelteKit 2, Svelte 5 (runes)                                   |
| Language        | TypeScript (strict)                                             |
| Package manager | yarn                                                            |
| Icons           | `@lucide/svelte`                                                |
| Deploy (web)    | `@sveltejs/adapter-static`; PWA bundle copied into `diary-site` |
| Mobile          | Capacitor 8 (iOS / Android)                                     |
| Storage         | `localStorage` (web) · SQLite (native)                          |
| Analytics       | Firebase (`awareness-journal`)                                  |

---

## Project structure

```
src/
├── routes/
│   └── +page.svelte           # the only screen; everything is panels
├── lib/
│   ├── events/                # domain: types, grouping, scoring, reflection status, export
│   ├── state/
│   │   ├── events.svelte.ts           # eventStore
│   │   └── day-reflections.svelte.ts  # dayReflectionStore
│   ├── storage/               # event-* and day-reflection-* repositories (local + sqlite)
│   ├── navigation/            # iOS-like stacked-panel system (panel-stack, PanelDeck)
│   ├── preferences/           # week start, day end, reflection-enabled toggle
│   ├── components/            # panels, chrome bar, ui/, navigation/
│   ├── platform/              # native init, text zoom, share intent
│   ├── i18n/                  # uk (default) + en, runes store
│   └── analytics.ts
└── static/
```

Navigation is **not routes** — `panel-stack.ts` drives an overlay stack of panels
(`capture`, `eventWizard`, `eventReport`, `dayReflection`, `calendar`) over the journal.

---

## Data & storage

Two collections, each behind a repository interface with a `local` (web `localStorage`,
keys `guanming.*`) and a `sqlite` (native, DB `guanming`) implementation;
`src/lib/storage/index.ts` is the facade.

| Collection      | Key                     | Mutable?                                                | Shape                                                             |
| --------------- | ----------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `EventEntry`    | `id` (UUID)             | yes — `protocol` (reflection) is added and edited later | `text`, `score`, `kind`, `createdAt`, `protocol?`                 |
| `DayReflection` | `dayKey` (`YYYY-MM-DD`) | yes                                                     | `nextActions`, `insights`, `score?`, `*Edited` flags, `updatedAt` |

SQLite schema changes use `PRAGMA table_info` + `ALTER TABLE` column checks (see
`event-sqlite.ts`), not version bumps.

---

## Development

```sh
yarn install
yarn dev            # http://localhost:5173
yarn check          # svelte-check + TypeScript
yarn lint           # prettier --check
yarn format         # prettier --write

yarn build          # static build → build/
yarn build:pwa      # BASE_PATH=/pwa build → copy into ../../diary-site/static/pwa
yarn build:mobile   # static build + cap sync
yarn ios            # open Xcode
yarn android        # open Android Studio
```

Agent instructions and MCP setup: [`AGENTS.md`](AGENTS.md) (canonical; `CLAUDE.md` /
`GEMINI.md` / Cursor rules point to it). Svelte code goes through the Svelte MCP server.

### Deploying the PWA

`yarn build:pwa` copies `build/` into `diary-site/static/pwa`. Commit and push
`diary-site`; its GitHub Actions workflow publishes `/pwa` at
[journal.eggs.gd/pwa](https://journal.eggs.gd/pwa).

---

## Analytics

`track(name, params?)` in `src/lib/analytics.ts`. Native → `@capacitor-firebase/analytics`
(bundled `GoogleService-Info.plist` / `google-services.json`). Firebase project
`awareness-journal`. Web analytics needs an explicit `initializeApp` on the client, which
lands with journal sync (see [`STORYBOARD.md`](STORYBOARD.md) → open work).

---

## License

Private project (`"private": true`).
