import { firebaseApp } from '$lib/firebase';
import type { CollectionSnapshot, DayReflection, EventEntry, Tombstone } from '$lib/events/types';

export interface RemoteSnapshot {
	events: CollectionSnapshot<EventEntry>;
	reflections: CollectionSnapshot<DayReflection>;
}

export interface RemotePush {
	events: { items: EventEntry[]; tombstones: Tombstone[] };
	reflections: { items: DayReflection[]; tombstones: Tombstone[] };
}

let modPromise: Promise<typeof import('firebase/database')> | null = null;
const mod = (): Promise<typeof import('firebase/database')> =>
	(modPromise ??= import('firebase/database'));

/** RTDB rejects objects containing `undefined`. Round-trip to drop them. */
function clean<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function toTombstones(node: Record<string, { deletedAt: string }> | undefined): Tombstone[] {
	return Object.entries(node ?? {}).map(([key, t]) => ({ key, deletedAt: t.deletedAt }));
}

export async function pullJournal(uid: string): Promise<RemoteSnapshot> {
	const { getDatabase, ref, get } = await mod();
	const db = getDatabase(firebaseApp!);
	const snap = await get(ref(db, `journals/${uid}`));
	const value = (snap.val() ?? {}) as {
		events?: Record<string, EventEntry>;
		eventTombstones?: Record<string, { deletedAt: string }>;
		reflections?: Record<string, DayReflection>;
		reflectionTombstones?: Record<string, { deletedAt: string }>;
	};

	return {
		events: {
			items: Object.values(value.events ?? {}),
			tombstones: toTombstones(value.eventTombstones)
		},
		reflections: {
			items: Object.values(value.reflections ?? {}),
			tombstones: toTombstones(value.reflectionTombstones)
		}
	};
}

export async function pushJournal(uid: string, push: RemotePush): Promise<void> {
	const patch: Record<string, unknown> = {};

	for (const e of push.events.items) patch[`journals/${uid}/events/${e.id}`] = clean(e);
	for (const t of push.events.tombstones) {
		patch[`journals/${uid}/eventTombstones/${t.key}`] = { deletedAt: t.deletedAt };
		patch[`journals/${uid}/events/${t.key}`] = null;
	}
	for (const r of push.reflections.items) {
		patch[`journals/${uid}/reflections/${r.dayKey}`] = clean(r);
	}
	for (const t of push.reflections.tombstones) {
		patch[`journals/${uid}/reflectionTombstones/${t.key}`] = { deletedAt: t.deletedAt };
		patch[`journals/${uid}/reflections/${t.key}`] = null;
	}

	if (Object.keys(patch).length === 0) return;

	const { getDatabase, ref, update } = await mod();
	const db = getDatabase(firebaseApp!);
	await update(ref(db), patch);
}
