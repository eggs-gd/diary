import type { Tombstone } from '$lib/events/types';

/** Union by key, keeping the earliest `deletedAt`. Tombstones are never dropped. */
export function mergeTombstones(...lists: Tombstone[][]): Tombstone[] {
	const byKey = new Map<string, Tombstone>();
	for (const list of lists) {
		for (const t of list) {
			const prev = byKey.get(t.key);
			if (!prev || t.deletedAt < prev.deletedAt) byKey.set(t.key, t);
		}
	}
	return [...byKey.values()];
}

export function tombstonesFor(keys: string[], deletedAt: string): Tombstone[] {
	return keys.map((key) => ({ key, deletedAt }));
}
