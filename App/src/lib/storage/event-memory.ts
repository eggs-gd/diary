import type { EventEntry, Tombstone } from '$lib/events/types';
import type { EventRepository } from './event-repository';
import { mergeTombstones, tombstonesFor } from './tombstones';

/**
 * Session-only event log: lives in memory and is gone on reload. Used until the user allows
 * saving, so nothing is written to the device (not even locally).
 */
export class MemoryEventRepository implements EventRepository {
	#entries: EventEntry[] = [];
	#tombstones: Tombstone[] = [];

	async ensureReady(): Promise<void> {}

	async loadAll(): Promise<EventEntry[]> {
		return [...this.#entries];
	}

	async loadTombstones(): Promise<Tombstone[]> {
		return [...this.#tombstones];
	}

	async save(entry: EventEntry): Promise<void> {
		const idx = this.#entries.findIndex((e) => e.id === entry.id);
		if (idx >= 0) this.#entries[idx] = entry;
		else this.#entries.unshift(entry);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		this.#removeAndTombstone(ids);
	}

	async clear(): Promise<void> {
		this.#removeAndTombstone(this.#entries.map((e) => e.id));
	}

	async replace(entries: EventEntry[], tombstones: Tombstone[]): Promise<void> {
		this.#entries = [...entries];
		this.#tombstones = mergeTombstones(tombstones);
	}

	#removeAndTombstone(ids: string[]): void {
		const remove = new Set(ids);
		this.#entries = this.#entries.filter((entry) => !remove.has(entry.id));
		this.#tombstones = mergeTombstones(
			this.#tombstones,
			tombstonesFor(ids, new Date().toISOString())
		);
	}
}
