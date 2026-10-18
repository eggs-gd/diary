import type { EventEntry, Tombstone } from '$lib/events/types';
import { normalizeEventKind } from '$lib/events/event-kind';
import { EVENTS_STORAGE_KEY, EVENT_TOMBSTONES_KEY, type EventRepository } from './event-repository';
import { mergeTombstones, tombstonesFor } from './tombstones';

function isEventEntry(value: unknown): value is EventEntry {
	if (!value || typeof value !== 'object') return false;
	const entry = value as Partial<EventEntry>;
	return (
		typeof entry.id === 'string' &&
		typeof entry.text === 'string' &&
		typeof entry.score === 'number' &&
		typeof entry.createdAt === 'string' &&
		(entry.kind === undefined || entry.kind === 'event' || entry.kind === 'act') &&
		(entry.protocol === undefined || typeof entry.protocol === 'object')
	);
}

function normalize(entry: EventEntry): EventEntry {
	return {
		...entry,
		kind: normalizeEventKind(entry.kind),
		updatedAt: entry.updatedAt ?? entry.createdAt
	};
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
			return Array.isArray(parsed) ? parsed.filter(isEventEntry).map(normalize) : [];
		} catch {
			return [];
		}
	}

	async loadTombstones(): Promise<Tombstone[]> {
		if (typeof localStorage === 'undefined') return [];
		try {
			const raw = localStorage.getItem(EVENT_TOMBSTONES_KEY);
			return raw ? (JSON.parse(raw) as Tombstone[]) : [];
		} catch {
			return [];
		}
	}

	async save(entry: EventEntry): Promise<void> {
		if (typeof localStorage === 'undefined') return;

		const entries = await this.loadAll();
		const idx = entries.findIndex((e) => e.id === entry.id);
		if (idx >= 0) {
			entries[idx] = normalize(entry);
		} else {
			entries.unshift(normalize(entry));
		}
		localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(entries));
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (typeof localStorage === 'undefined' || ids.length === 0) return;
		await this.#removeAndTombstone(ids);
	}

	async clear(): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		const ids = (await this.loadAll()).map((e) => e.id);
		await this.#removeAndTombstone(ids);
	}

	async replace(entries: EventEntry[], tombstones: Tombstone[]): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(entries.map(normalize)));
		localStorage.setItem(EVENT_TOMBSTONES_KEY, JSON.stringify(mergeTombstones(tombstones)));
	}

	async #removeAndTombstone(ids: string[]): Promise<void> {
		const remove = new Set(ids);
		const entries = (await this.loadAll()).filter((entry) => !remove.has(entry.id));
		localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(entries));

		const tombstones = mergeTombstones(
			await this.loadTombstones(),
			tombstonesFor(ids, new Date().toISOString())
		);
		localStorage.setItem(EVENT_TOMBSTONES_KEY, JSON.stringify(tombstones));
	}
}
