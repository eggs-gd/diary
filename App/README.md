# App

SvelteKit application. PWA first, with Capacitor shells for iOS and Android.

## Stack

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| Framework       | SvelteKit 2, Svelte 5 (runes)                                  |
| Language        | TypeScript (strict)                                            |
| Package manager | yarn                                                           |
| Icons           | `@lucide/svelte`                                               |
| Deploy (web)    | `@sveltejs/adapter-static`; `yarn build:pwa` sets `BASE_PATH=/pwa` |
| Mobile          | Capacitor 8 (iOS / Android)                                    |
| Storage         | `localStorage` (web) · SQLite (native)                         |
| Analytics       | Firebase (`awareness-journal`)                                 |

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

## Development

```sh
yarn install
yarn dev            # http://localhost:5173
yarn check          # svelte-check + TypeScript
yarn lint           # prettier --check
yarn format         # prettier --write

yarn build          # static build → build/
yarn preview
yarn build:pwa      # BASE_PATH=/pwa
yarn build:mobile   # static build + cap sync
yarn assets:generate
yarn ios            # open Xcode
yarn android        # open Android Studio
```

## Data and storage

Two collections, each behind a repository interface with a `local` (web `localStorage`,
keys `guanming.*`) and a `sqlite` (native, DB `guanming`) implementation;
`src/lib/storage/index.ts` is the facade.

| Collection      | Key                     | Mutable?                                                | Shape                                                             |
| --------------- | ----------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `EventEntry`    | `id` (UUID)             | yes — `protocol` (reflection) is added and edited later | `text`, `score`, `kind`, `createdAt`, `protocol?`                 |
| `DayReflection` | `dayKey` (`YYYY-MM-DD`) | yes                                                     | `nextActions`, `insights`, `score?`, `*Edited` flags, `updatedAt` |

SQLite schema changes use `PRAGMA table_info` + `ALTER TABLE` column checks (see
`event-sqlite.ts`), not version bumps.

Optional cross-device sync is specified in `docs/sync.md`. Deletes leave tombstones.
Sharing an event into the I Ching PWA is specified in `docs/iching-share.md`.

## Analytics

`track(name, params?)` in `src/lib/analytics.ts` — native via
`@capacitor-firebase/analytics`, web via `firebase/analytics` (lazy, `isSupported()`),
both initialised from `src/lib/firebase.ts`. Firebase project `awareness-journal`.

## License

Private project (`"private": true`).
