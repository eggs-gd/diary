# Attention Journal

**觀明 (Guān Míng) · Attention Journal** — not a diary. Capture what catches your attention;
come back later to see what happened, the story you told yourself about it, and whether
another reading is true.

The name 觀明 — _observe_ + _clarity_ — is a symbol, not a title or a literal translation.

## Status

- **PWA — the primary platform.** [journal.eggs.gd](https://journal.eggs.gd). Every feature
  must work there.
- **iOS / Android** — Capacitor shells are built (`gd.eggs.diary`, 1.0.1).

Design decisions are made PWA-first. See [docs/platform.md](docs/platform.md).

## Read next

- [docs/overview.md](docs/overview.md) — capture, reflection, calendar.
- [docs/platform.md](docs/platform.md) — what is native and what the PWA already does.
- [STORYBOARD.md](STORYBOARD.md) — product concept (Ukrainian, living doc).
- [docs/sync.md](docs/sync.md) — optional journal sync.
- [docs/iching-share.md](docs/iching-share.md) — share an event into the I Ching PWA.

## Modules

- [App/](App/) — the SvelteKit app. Engineering guide: [App/README.md](App/README.md).
- [Site/](Site/) — the landing page. [Site/README.md](Site/README.md).
- [scripts/](scripts/) — copies the built PWA into the site.

Agent instructions: [AGENTS.md](AGENTS.md).

## Development

Both blocks start from the repository root.

```sh
cd App
yarn install
yarn dev            # http://localhost:5173
```

```sh
cd Site
yarn install
yarn dev
```

## Publishing

A push to `main` that changes `App/`, `Site/`, or `scripts/` runs
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). The workflow builds the app
with `BASE_PATH=/pwa`, copies that bundle into `Site/static/pwa`, then builds the landing
page and publishes both at [journal.eggs.gd](https://journal.eggs.gd). The landing page is
the domain root; the app is at `/pwa`.

`App` depends on the public package `@eggs/kit` (`link:../../eggs.gd-kit`). The workflow
checks that repo out next to the app; no secret is needed.
Locally, `yarn build:pwa` from `App/` only builds; `make pwa` copies `App/build` into
`Site/static/pwa`.
