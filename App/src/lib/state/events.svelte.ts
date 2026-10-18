import type { CollectionSnapshot, EventEntry } from '$lib/events/types';
import {
	clearEventEntries,
	deleteEventEntries,
	loadEventEntries,
	loadEventTombstones,
	replaceEventEntries,
	saveEventEntry
} from '$lib/storage';

export class EventStore {
	entries = $state<EventEntry[]>([]);
	loaded = $state(false);

	/** Set by the sync controller; fires after user-initiated mutations only. */
	#onMutate: (() => void) | null = null;

	setMutationListener(fn: (() => void) | null): void {
		this.#onMutate = fn;
	}

	async load(): Promise<void> {
		this.entries = await loadEventEntries();
		this.loaded = true;
	}

	async add(entry: EventEntry): Promise<void> {
		const stamped = { ...entry, updatedAt: entry.updatedAt ?? entry.createdAt };
		await saveEventEntry(stamped);
		this.entries = [stamped, ...this.entries.filter((item) => item.id !== stamped.id)];
		this.#onMutate?.();
	}

	async clear(): Promise<void> {
		await clearEventEntries();
		this.entries = [];
		this.#onMutate?.();
	}

	async update(entry: EventEntry): Promise<void> {
		const stamped = { ...entry, updatedAt: new Date().toISOString() };
		await saveEventEntry(stamped);
		this.entries = this.entries.map((e) => (e.id === stamped.id ? stamped : e));
		this.#onMutate?.();
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await deleteEventEntries(ids);
		this.entries = await loadEventEntries();
		this.#onMutate?.();
	}

	async snapshot(): Promise<CollectionSnapshot<EventEntry>> {
		return { items: this.entries, tombstones: await loadEventTombstones() };
	}

	/** Apply a merged snapshot from sync. Does not fire the mutation listener. */
	async applyMerged(snapshot: CollectionSnapshot<EventEntry>): Promise<void> {
		await replaceEventEntries(snapshot.items, snapshot.tombstones);
		this.entries = await loadEventEntries();
	}
}

export const eventStore = new EventStore();
