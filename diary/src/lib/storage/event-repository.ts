import type { EventEntry } from '$lib/events/types';

export interface EventRepository {
	ensureReady(): Promise<void>;
	loadAll(): Promise<EventEntry[]>;
	save(entry: EventEntry): Promise<void>;
	deleteByIds(ids: string[]): Promise<void>;
	clear(): Promise<void>;
}

export const EVENTS_STORAGE_KEY = 'guanming.events.v1';
export const EVENTS_MIGRATED_KEY = 'guanming_events_migrated';
