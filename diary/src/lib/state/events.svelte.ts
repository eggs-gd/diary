import type { EventEntry } from '$lib/events/types';
import {
	clearEventEntries,
	deleteEventEntries,
	loadEventEntries,
	saveEventEntry
} from '$lib/storage';

export class EventStore {
	entries = $state<EventEntry[]>([]);
	loaded = $state(false);

	async load(): Promise<void> {
		this.entries = await loadEventEntries();
		this.loaded = true;
	}

	async add(entry: EventEntry): Promise<void> {
		await saveEventEntry(entry);
		this.entries = [entry, ...this.entries.filter((item) => item.id !== entry.id)];
	}

	async clear(): Promise<void> {
		await clearEventEntries();
		this.entries = [];
	}

	async update(entry: EventEntry): Promise<void> {
		await saveEventEntry(entry);
		this.entries = this.entries.map((e) => (e.id === entry.id ? entry : e));
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await deleteEventEntries(ids);
		this.entries = await loadEventEntries();
	}
}

export const eventStore = new EventStore();
