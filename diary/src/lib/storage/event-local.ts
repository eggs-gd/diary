import type { EventEntry } from '$lib/events/types';
import { EVENTS_STORAGE_KEY, type EventRepository } from './event-repository';

function isEventEntry(value: unknown): value is EventEntry {
	if (!value || typeof value !== 'object') return false;
	const entry = value as Partial<EventEntry>;
	return (
		typeof entry.id === 'string' &&
		typeof entry.text === 'string' &&
		typeof entry.score === 'number' &&
		typeof entry.createdAt === 'string' &&
		(entry.protocol === undefined || typeof entry.protocol === 'object')
	);
}

export class LocalEventRepository implements EventRepository {
	async ensureReady(): Promise<void> {
		// localStorage is available in browser contexts we target.
	}

	async loadAll(): Promise<EventEntry[]> {
		if (typeof localStorage === 'undefined') return [];

		try {
			const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw) as unknown;
			return Array.isArray(parsed) ? parsed.filter(isEventEntry) : [];
		} catch {
			return [];
		}
	}

	async save(entry: EventEntry): Promise<void> {
		if (typeof localStorage === 'undefined') return;

		const entries = await this.loadAll();
		const idx = entries.findIndex((e) => e.id === entry.id);
		if (idx >= 0) {
			entries[idx] = entry;
		} else {
			entries.unshift(entry);
		}
		localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(entries));
	}

	async clear(): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		localStorage.removeItem(EVENTS_STORAGE_KEY);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (typeof localStorage === 'undefined' || ids.length === 0) return;

		const remove = new Set(ids);
		const entries = (await this.loadAll()).filter((entry) => !remove.has(entry.id));
		localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(entries));
	}
}
