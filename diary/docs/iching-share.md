# Share an event to the I Ching PWA

Each event in the main Journal list has a compact **share** action next to the
reflection (pencil) icon. It forwards the event text into the I Ching PWA as a
prefilled question — no manual copy/paste, no change to the event.

## Contract

PWA-to-PWA deeplink, defined by **CORE-144** and implemented on the I Ching side
by **CORE-147** (see `eGGs.gd.prod/i-ching` → `docs/pwa-deeplink.md`). This is
the Journal/Diary side (**CORE-145**).

```
https://iching.eggs.gd/pwa/?q=<url-encoded question>
```

- Only `q` is sent. There is **no `mode` parameter** in v1.
- `q` is the event text, verbatim, with surrounding and internal whitespace
  collapsed so the URL stays readable. No extra phrasing or interpretation is
  added.
- The value is encoded with `URLSearchParams` (spaces as `+`); the I Ching PWA
  reads it with `URLSearchParams.get('q')` (one percent-decode) and trims it.
- When `q` is present and non-blank, the I Ching PWA prefills the question and
  auto-starts a virtual all-coins toss. A blank result is a no-op there, so the
  share action does nothing when an event has no text.

## Scope / non-goals

PWA only. No native links, custom URL schemes, Universal Links / App Links, AASA
files, or Capacitor-specific handling — the link opens in a new tab via
`window.open`.

## Where it lives

| Piece                 | Location                                  |
| --------------------- | ---------------------------------------- |
| Deeplink builder      | `src/lib/integrations/iching.ts`         |
| Share button (list)   | `src/lib/components/ArchiveList.svelte`  |
| Handler + analytics   | `src/routes/+page.svelte` (`shareEntryToIChing`) |

Analytics event: `event_shared_to_iching` (`shared`, `textLength`).

## Manual verification

1. `yarn dev` → open the Journal, click the share icon on an event →
   `https://iching.eggs.gd/pwa/?q=...` opens with the event text as `q`.
2. Inspect the URL: `q` is URL-encoded, no `mode` param, base is
   `https://iching.eggs.gd/pwa/`.
3. The event is unchanged in the list (no edit, no persisted change).
4. The edit/reflection action on the same event still opens the reflection flow.
