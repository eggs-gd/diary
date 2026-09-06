# AGENTS.md

Canonical agent instructions for this repo. **Edit this file — don't fork it.**
Cursor, Codex, Gemini, and Claude all resolve here:

- Codex and any other `AGENTS.md`-native tool read this file directly.
- `CLAUDE.md` and `GEMINI.md` are pointers to this file.
- `.cursor/rules/project.mdc` points Cursor here (`alwaysApply`).

**觀明 (Guān Míng) · Attention Journal** — not a diary. It helps a person see what
happened, the story they told themselves about it, and whether another reading exists.
Product concept: [`STORYBOARD.md`](./STORYBOARD.md) (Ukrainian, living doc).

## Golden rule: PWA-first

The PWA ([journal.eggs.gd](https://journal.eggs.gd)) is priority 0. Every feature must work
there. Native (Capacitor iOS / Android, `gd.eggs.diary`) adds platform integration on top,
and every native capability needs a web fallback. Make design and architecture decisions
with the PWA in mind first.

## Stack & workflow

- SvelteKit 2 · Svelte 5 (runes) · TypeScript (strict) · yarn · `@lucide/svelte` for icons.
- `yarn dev` · `yarn check` (svelte-check) · `yarn lint` (prettier --check) · `yarn build`.
- Deploy PWA: `yarn build:pwa` rebuilds with `BASE_PATH=/pwa` and copies `build/` into
  `../../diary-site/static/pwa`; that repo's CI publishes `/pwa`.
- Prettier: tabs, single quotes, no trailing comma, width 100. Run `yarn format` before
  finishing. `STORYBOARD.md` is prettier-ignored on purpose.
- Don't commit or push unless asked — propose the change, let the maintainer push.

## MCP servers

Four configs must stay in sync — change one, change all: `.mcp.json` (Claude Code),
`.cursor/mcp.json` (Cursor), `.vscode/mcp.json` (VS Code), `.gemini/settings.json`
(Gemini).

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

### ts-language — `ts-language-mcp .`

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
- Prefer `rename_symbol` over hand-editing any identifier rename; run `yarn check` after.

## Where things live

- App code: `src/`. Two data types:
  - **events** (`EventEntry`, UUID `id`) — a captured moment; `protocol` (reflection) is
    added and edited later, so entries are **mutable**.
    `src/lib/state/events.svelte.ts`.
  - **day reflections** (`DayReflection`, `dayKey`) — one per day, mutable, has `updatedAt`.
    `src/lib/state/day-reflections.svelte.ts`.
- Storage: `src/lib/storage/` — `event-*` and `day-reflection-*` repositories, each
  `local` (web `localStorage`, keys `guanming.*`) + `sqlite` (native, DB `guanming`),
  behind an interface; `storage/index.ts` is the facade.
- Navigation: `src/lib/navigation/` — an iOS-like stacked-panel system (`panel-stack.ts`,
  `PanelDeck`), not routes. `src/routes/+page.svelte` is the only screen.
- i18n: `src/lib/i18n/` — uk (default) + en, runes store.
- Preferences: `src/lib/preferences/` — week start, day end, reflection-enabled toggle.
- Analytics: `src/lib/analytics.ts`. Firebase project `awareness-journal`.
- Product concept and open questions: [`STORYBOARD.md`](./STORYBOARD.md).
