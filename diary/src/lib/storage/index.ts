import { Capacitor } from '@capacitor/core';
import type { EventEntry } from '$lib/events/types';
import { LocalEventRepository } from './event-local';
import type { EventRepository } from './event-repository';
import { SqliteEventRepository } from './event-sqlite';

let repository: EventRepository | null = null;

function getRepository(): EventRepository {
	if (!repository) {
		repository = Capacitor.isNativePlatform()
			? new SqliteEventRepository()
			: new LocalEventRepository();
	}
	return repository;
}

export async function ensureEventsReady(): Promise<void> {
	await getRepository().ensureReady();
}

export async function loadEventEntries(): Promise<EventEntry[]> {
	await ensureEventsReady();
	return getRepository().loadAll();
}

export async function saveEventEntry(entry: EventEntry): Promise<void> {
	await ensureEventsReady();
	await getRepository().save(entry);
}

export async function deleteEventEntries(ids: string[]): Promise<void> {
	await ensureEventsReady();
	await getRepository().deleteByIds(ids);
}

export async function clearEventEntries(): Promise<void> {
	await ensureEventsReady();
	await getRepository().clear();
}
