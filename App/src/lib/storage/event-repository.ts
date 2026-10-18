import type { EventEntry, Tombstone } from '$lib/events/types';

export interface EventRepository {
	ensureReady(): Promise<void>;
	loadAll(): Promise<EventEntry[]>;
	loadTombstones(): Promise<Tombstone[]>;
	save(entry: EventEntry): Promise<void>;
	/** Removes the entries and records tombstones (kept forever, regardless of auth). */
	deleteByIds(ids: string[]): Promise<void>;
	/** Removes every entry and tombstones each one. Local-only wipe still leaves the trail. */
	clear(): Promise<void>;
	/** Wholesale replace of both sets — used by sync after a merge. */
	replace(entries: EventEntry[], tombstones: Tombstone[]): Promise<void>;
}

export const EVENTS_STORAGE_KEY = 'guanming.events.v1';
export const EVENT_TOMBSTONES_KEY = 'guanming.event-tombstones.v1';
export const EVENTS_MIGRATED_KEY = 'guanming_events_migrated';
