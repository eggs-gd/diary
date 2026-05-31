import { Capacitor } from '@capacitor/core';
import type { DayReflection } from '$lib/events/types';
import type { EventEntry } from '$lib/events/types';
import { LocalDayReflectionRepository } from './day-reflection-local';
import type { DayReflectionRepository } from './day-reflection-repository';
import { SqliteDayReflectionRepository } from './day-reflection-sqlite';
import { LocalEventRepository } from './event-local';
import type { EventRepository } from './event-repository';
import { SqliteEventRepository } from './event-sqlite';

let repository: EventRepository | null = null;
let dayReflectionRepository: DayReflectionRepository | null = null;

function getRepository(): EventRepository {
	if (!repository) {
		repository = Capacitor.isNativePlatform()
			? new SqliteEventRepository()
			: new LocalEventRepository();
	}
	return repository;
}

function getDayReflectionRepository(): DayReflectionRepository {
	if (!dayReflectionRepository) {
		dayReflectionRepository = Capacitor.isNativePlatform()
			? new SqliteDayReflectionRepository()
			: new LocalDayReflectionRepository();
	}
	return dayReflectionRepository;
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

export async function ensureDayReflectionsReady(): Promise<void> {
	await getDayReflectionRepository().ensureReady();
}

export async function loadDayReflections(): Promise<DayReflection[]> {
	await ensureDayReflectionsReady();
	return getDayReflectionRepository().loadAll();
}

export async function saveDayReflection(reflection: DayReflection): Promise<void> {
	await ensureDayReflectionsReady();
	await getDayReflectionRepository().save(reflection);
}

export async function deleteDayReflections(dayKeys: string[]): Promise<void> {
	await ensureDayReflectionsReady();
	await getDayReflectionRepository().deleteByDayKeys(dayKeys);
}

export async function clearDayReflections(): Promise<void> {
	await ensureDayReflectionsReady();
	await getDayReflectionRepository().clear();
}
