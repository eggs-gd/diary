# AGENTS.md

Canonical agent instructions for this repo. **Edit this file — don't fork it.**
Cursor, Codex, Gemini, and Claude all resolve here:

- Codex reads this file directly. Its MCP servers are in `.codex/config.toml`.
- `CLAUDE.md` and `GEMINI.md` are pointers to this file.
- `.cursor/rules/project.mdc` points Cursor here (`alwaysApply`).

**觀明 (Guān Míng) · Attention Journal** — not a diary. It helps a person see what
happened, the story they told themselves about it, and whether another reading exists.
Product concept: [`STORYBOARD.md`](./STORYBOARD.md) (Ukrainian, living doc). Full detail:
[README.md](./README.md), [docs/overview.md](./docs/overview.md).

## Golden rule: PWA-first

The PWA ([journal.eggs.gd](https://journal.eggs.gd)) is priority 0. Every feature must work
there. Native (Capacitor iOS / Android, `gd.eggs.diary`) adds platform integration on top,
and every native capability needs a web fallback. Make design and architecture decisions
with the PWA in mind first. See [docs/platform.md](./docs/platform.md).

## Stack & workflow

- SvelteKit 2 · Svelte 5 (runes) · TypeScript (strict) · yarn · `@lucide/svelte` for icons.
- From `App/`: `yarn dev` · `yarn check` (svelte-check) · `yarn lint` (prettier --check) · `yarn build`.
- From `Site/`: `yarn dev` · `yarn check` · `yarn build`.
- Deploy: `.github/workflows/deploy.yml` runs `yarn build:pwa` in `App/` (`BASE_PATH=/pwa`),
  then `scripts/deploy-pwa.mjs` (`make pwa` locally), then builds the site. Pushes that touch
  `App/`, `Site/`, or `scripts/` publish both. CI checks out the public `eggs-gd/eggs.gd-kit`
  next to the app; no secret is needed.
- Prettier: tabs, single quotes, no trailing comma, width 100. Run `yarn format` before
  finishing. `STORYBOARD.md` is prettier-ignored on purpose.
- SEO, head metadata, sitemap, footer and cross-links for `Site/` follow the spec in
  [eggs-gd/eggs.gd-site `docs/seo.md`](https://github.com/eggs-gd/eggs.gd-site/blob/main/docs/seo.md).
- Don't commit or push unless asked — propose the change, let the maintainer push.

## MCP servers

Five configs must stay in sync — change one, change all: `.mcp.json` (Claude Code),
`.cursor/mcp.json` (Cursor), `.vscode/mcp.json` (VS Code), `.gemini/settings.json`
(Gemini), `.codex/config.toml` (Codex).

### svelte — `@sveltejs/mcp`

Svelte 5 / SvelteKit documentation plus a Svelte-aware linter. **Use it for every change to
`.svelte` / `.svelte.ts` code.**

- `list-sections` — call FIRST for any Svelte / SvelteKit question. Returns the doc index
  (titles, `use_cases`, paths).
- `get-documentation` — fetch the full text of every section `list-sections` flagged as
  relevant (accepts a list). Do this before writing code.
- `svelte-autofixer` — run on Svelte code you wrote or changed, **before presenting or
  finalising it**. Loop: fix → re-run → repeat until it returns no issues and no
  suggestions. This is not optional.
- `playground-link` — only on explicit user request, and NEVER for code already written to
  files in this repo.

### design-patterns — `design_patterns_mcp`

A catalog of 705+ design patterns with hybrid RAG search. Consult it before non-trivial
structural decisions. Skip it for small local changes.

- `find_patterns` — `{ query, categories?, programmingLanguage?, maxResults=5 }` — semantic
  search from a problem statement.
- `search_patterns` — `{ query, searchType: keyword | semantic | hybrid, limit=10 }`.
- `get_pattern_details` — `{ patternId }` — full write-up and code examples.
- `count_patterns` / `get_health_status` — catalog stats / server health.
- Binaries live under `$AGENTS_TOOLS_DIR` (default `~/.agents/design_patterns_mcp`); the
  SQLite path is passed as `DATABASE_PATH` in the launch command.

### ts-language — two servers

The tool takes one project directory. `ts-language` is `App`; `ts-language-site` is `Site`.
Use the server that matches the file you are reading. Same tools on both.

TypeScript compiler intelligence. Use it instead of grep / whole-file reads when you need
to know how TS code connects. Position-based tools accept `symbol: "EventStore.update"` in
place of line/column; an ambiguous name returns candidates.

- Navigation: `get_definition`, `get_type_definition`, `get_references`,
  `get_implementations`, `get_call_hierarchy`, `get_type_hierarchy`.
- Types: `get_hover`, `get_signature`.
- Structure: `get_symbols`, `get_outline`, `get_imports`, `find`, `get_workspace_symbols`.
- Diagnostics: `get_diagnostics`, `get_all_diagnostics`, `get_completions`.
- Refactor — **writes to disk**: `rename_symbol`, `apply_code_fix`, `format_document`,
  `organize_imports` (`apply: true`); preview-only: `rename_preview`, `get_code_fixes`.
- Quality: `calculate_metrics`, `detect_duplication`, `find_indirection_hotspots`,
  `get_module_dependencies`, `quality_report`.
- Efficiency: `analyze_position`, `batch_analyze`.
- Prefer `rename_symbol` over hand-editing any identifier rename; run `yarn check`
  in the module you changed (`App/` or `Site/`) afterwards regardless.

## Where things live

- Product behavior: [docs/overview.md](./docs/overview.md). Platform rule:
  [docs/platform.md](./docs/platform.md).
- App code: `App/src/` — structure map in [App/README.md](./App/README.md). Two data types:
  - **events** (`EventEntry`, UUID `id`) — a captured moment; `protocol` (reflection) is
    added and edited later, so entries are **mutable**.
    `App/src/lib/state/events.svelte.ts`.
  - **day reflections** (`DayReflection`, `dayKey`) — one per day, mutable, has `updatedAt`.
    `App/src/lib/state/day-reflections.svelte.ts`.
- Landing page: `Site/`.
- Storage: `App/src/lib/storage/` — `event-*` and `day-reflection-*` repositories, each
  `local` (web `localStorage`, keys `guanming.*`) + `sqlite` (native, DB `guanming`),
  behind an interface; `storage/index.ts` is the facade. Deletes write tombstones
  (`tombstones.ts`), kept forever.
- Auth + journal sync: `App/src/lib/state/auth.svelte.ts`, `App/src/lib/sync/`. Both collections,
  LWW by `updatedAt`, one-shot sync, **no live listeners by design** —
  [`docs/sync.md`](./docs/sync.md).
- Navigation: `App/src/lib/navigation/` — an iOS-like stacked-panel system (`panel-stack.ts`,
  `PanelDeck`), not routes. `App/src/routes/+page.svelte` is the only screen.
- i18n: `App/src/lib/i18n/` — uk (default) + en, runes store.
- Preferences: `App/src/lib/preferences/` — week start, day end, reflection-enabled toggle.
- Analytics: `App/src/lib/analytics.ts`. Firebase project `awareness-journal`.
- Share into I Ching: [`docs/iching-share.md`](./docs/iching-share.md).
- Product concept and open questions: [`STORYBOARD.md`](./STORYBOARD.md).
