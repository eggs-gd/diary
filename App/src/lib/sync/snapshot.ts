import type { CollectionSnapshot, Tombstone } from '$lib/events/types';
import { mergeTombstones } from '$lib/storage/tombstones';

/**
 * Merge two snapshots of one collection. Records are keyed by `keyOf` and carry
 * an `updatedAtOf` timestamp; the newer one wins (last-write-wins). Anything with
 * a tombstone is dropped, and delete beats any surviving copy.
 */
export function mergeCollection<T>(
	keyOf: (item: T) => string,
	updatedAtOf: (item: T) => string,
	a: CollectionSnapshot<T>,
	b: CollectionSnapshot<T>
): CollectionSnapshot<T> {
	const tombstones = mergeTombstones(a.tombstones, b.tombstones);
	const dead = new Set(tombstones.map((t) => t.key));

	const byKey = new Map<string, T>();
	for (const item of [...a.items, ...b.items]) {
		const key = keyOf(item);
		if (dead.has(key)) continue;
		const existing = byKey.get(key);
		if (!existing || updatedAtOf(item) > updatedAtOf(existing)) {
			byKey.set(key, item);
		}
	}

	return { items: [...byKey.values()], tombstones };
}

/** What `merged` holds that `remote` does not yet — the push payload. */
export function diffForRemote<T>(
	keyOf: (item: T) => string,
	updatedAtOf: (item: T) => string,
	remote: CollectionSnapshot<T>,
	merged: CollectionSnapshot<T>
): { items: T[]; tombstones: Tombstone[] } {
	const remoteByKey = new Map(remote.items.map((i) => [keyOf(i), updatedAtOf(i)]));
	const remoteTombstones = new Set(remote.tombstones.map((t) => t.key));

	return {
		items: merged.items.filter((i) => {
			const at = remoteByKey.get(keyOf(i));
			return at === undefined || updatedAtOf(i) > at;
		}),
		tombstones: merged.tombstones.filter((t) => !remoteTombstones.has(t.key))
	};
}
