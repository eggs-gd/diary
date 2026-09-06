# Journal sync

Opt-in cross-device sync for both collections — **events** and **day reflections**.
Local-first stays the default; the app is fully usable with no account. Signing in with
Google mirrors the journal through Firebase Realtime Database so the user's signed-in
devices share one journal.

## Data model (RTDB)

```
/journals/{uid}/events/{id}                 → EventEntry (+ updatedAt)
/journals/{uid}/eventTombstones/{id}        → { deletedAt }
/journals/{uid}/reflections/{dayKey}        → DayReflection
/journals/{uid}/reflectionTombstones/{dayKey} → { deletedAt }
```

Security rules scope each subtree to its owner:

```json
{ "rules": { "journals": { "$uid": {
  ".read":  "auth != null && auth.uid === $uid",
  ".write": "auth != null && auth.uid === $uid"
}}}}
```

Stored as plaintext (not end-to-end encrypted); the privacy policy discloses this.

## Records are mutable — LWW

Both collections change after creation:

- an **event**'s `protocol` (reflection) is added and edited later
- a **day reflection**'s fields are edited over time

So the merge is **last-write-wins** by `updatedAt`, not pure set union:

- `EventEntry.updatedAt` was added for this — stamped by `eventStore` (`= createdAt` on
  create, `= now` on every edit); absent on legacy entries → treated as `createdAt`.
  SQLite column added via the existing `PRAGMA table_info` check.
- `DayReflection.updatedAt` already existed.

`mergeCollection<T>(keyOf, updatedAtOf, a, b)` in
[`src/lib/sync/snapshot.ts`](../src/lib/sync/snapshot.ts) — union by key, newer
`updatedAt` wins, minus anything tombstoned (delete beats a surviving copy). Tombstones
union by earliest `deletedAt`.

## Tombstones — always written, never dropped

Deletes used to be silent. Now **every** removal writes a tombstone in the repository
layer, regardless of auth state:

- `deleteByIds` / `deleteByDayKeys` — tombstone each key
- `clear()` — tombstones **every** key it wipes (local-only wipe still leaves the trail)

Tombstones are kept forever (~50 bytes each). This is a hard requirement, not a v1
shortcut: without it, a delete made while signed out would be undone by the next sign-in's
union merge (e.g. sign in on B → sync → sign in on A → pull → sign out → delete → sign in
→ the deleted entries come back).

Storage: `localStorage['guanming.event-tombstones.v1']` /
`['guanming.day-reflection-tombstones.v1']` (web); `event_tombstones` /
`day_reflection_tombstones` tables (native, DB `guanming`). `JournalRepository`s gained
`loadTombstones()` and `replace(items, tombstones)` (wholesale write after a merge).

## When it syncs — one-shot, no listeners

**Deliberate. No live subscriptions / `onValue` listeners.**

`syncNow()` — `pull → merge both collections → apply locally → push the diff` — runs on:

- sign-in
- `visibilitychange` → visible (tab refocus / app foreground; Capacitor fires this too)
- the manual **Sync now** button in the profile drawer
- ~4 s debounce after a local mutation (both stores fire a mutation listener)

`resumeSync()` is throttled to once per 30 s.

### Why no listeners

Firebase Spark caps **simultaneous connections at 100** (RTDB); a persistent `onValue` per
open app burns one each. Op-count is not the constraint on RTDB — sockets are. And this is
a reflection journal, not a realtime collaborative app: "eventually consistent within a
focus change" is the right latency target.

### Consequence (accepted)

A device left open and focused does not receive another device's changes until it is
re-focused, the user acts, or they hit **Sync now**. `visibilitychange` covers almost
everything.

## `clear()` under sync (accepted behaviour)

`clear()` is local-only and does not delete from the cloud — it only tombstones what the
device had. A signed-in user who clears will see cloud entries return on the next sync
(union merge). To remove something from everywhere, delete it individually (that
tombstone propagates). Data is small; this is fine.

## Quota

RTDB Spark free tier: 1 GB stored + 10 GB/month transfer. No incremental cursor — a full
pull-and-merge is cheap at this scale. The binding limit is storage → roughly ~1000 active
users before Blaze.

## Files

| File | Role |
| --- | --- |
| `src/lib/firebase.ts` | web Firebase init; `databaseURL`, `SYNC_ENABLED` |
| `src/lib/state/auth.svelte.ts` | Google sign-in (`authStore`); web popup + redirect fallback |
| `src/lib/sync/snapshot.ts` | `mergeCollection`, `diffForRemote` — pure, generic |
| `src/lib/sync/remote.ts` | RTDB `pullJournal` / `pushJournal` (lazy `firebase/database`) |
| `src/lib/sync/controller.svelte.ts` | `syncController` — status, triggers, debounce/throttle, both collections |
| `src/lib/components/navigation/ProfileDrawerContent.svelte` | Sync section (sign in / status / Sync now / sign out / privacy) |
| `src/lib/storage/*` | tombstones + `replace` across local / sqlite; `tombstones.ts` helpers |

## Not done

- **Native auth** — `@capacitor-firebase/authentication`. Sync is web-only until then; on
  native the sync section is hidden (`authStore.available` is false).
- **E2E encryption** — v1 trusts Firebase security rules.
- **Incremental sync** — not needed at current scale.
