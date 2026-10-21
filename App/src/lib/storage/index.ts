import { Capacitor } from '@capacitor/core';
import type { DayReflection, EventEntry, Tombstone } from '$lib/events/types';
import { LocalDayReflectionRepository } from './day-reflection-local';
import type { DayReflectionRepository } from './day-reflection-repository';
import { SqliteDayReflectionRepository } from './day-reflection-sqlite';
import { LocalEventRepository } from './event-local';
import type { EventRepository } from './event-repository';
import { MemoryDayReflectionRepository } from './day-reflection-memory';
import { MemoryEventRepository } from './event-memory';
import { hasStoredConsent } from '$lib/analytics';
import { SqliteEventRepository } from './event-sqlite';

let persistentEvents: EventRepository | null = null;
let persistentReflections: DayReflectionRepository | null = null;
let memoryEvents: MemoryEventRepository | null = null;
let memoryReflections: MemoryDayReflectionRepository | null = null;

function getPersistentEvents(): EventRepository {
	if (!persistentEvents) {
		persistentEvents = Capacitor.isNativePlatform()
			? new SqliteEventRepository()
			: new LocalEventRepository();
	}
	return persistentEvents;
}

function getPersistentReflections(): DayReflectionRepository {
	if (!persistentReflections) {
		persistentReflections = Capacitor.isNativePlatform()
			? new SqliteDayReflectionRepository()
			: new LocalDayReflectionRepository();
	}
	return persistentReflections;
}

/** Saves to the device only after the user allowed it; until then everything is session-only. */
function getRepository(): EventRepository {
	if (hasStoredConsent()) return getPersistentEvents();
	memoryEvents ??= new MemoryEventRepository();
	return memoryEvents;
}

function getDayReflectionRepository(): DayReflectionRepository {
	if (hasStoredConsent()) return getPersistentReflections();
	memoryReflections ??= new MemoryDayReflectionRepository();
	return memoryReflections;
}

/** Called when the user allows saving: moves what was written this session onto the device. */
export async function enablePersistence(): Promise<void> {
	if (memoryEvents) {
		const session = await memoryEvents.loadAll();
		const target = getPersistentEvents();
		await target.ensureReady();
		for (const entry of [...session].reverse()) await target.save(entry);
		memoryEvents = null;
	}
	if (memoryReflections) {
		const session = await memoryReflections.loadAll();
		const target = getPersistentReflections();
		await target.ensureReady();
		for (const reflection of session) await target.save(reflection);
		memoryReflections = null;
	}
}

export async function ensureEventsReady(): Promise<void> {
	await getRepository().ensureReady();
}

export async function loadEventEntries(): Promise<EventEntry[]> {
	await ensureEventsReady();
	return getRepository().loadAll();
}

export async function loadEventTombstones(): Promise<Tombstone[]> {
	await ensureEventsReady();
	return getRepository().loadTombstones();
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

export async function replaceEventEntries(
	entries: EventEntry[],
	tombstones: Tombstone[]
): Promise<void> {
	await ensureEventsReady();
	await getRepository().replace(entries, tombstones);
}

export async function ensureDayReflectionsReady(): Promise<void> {
	await getDayReflectionRepository().ensureReady();
}

export async function loadDayReflections(): Promise<DayReflection[]> {
	await ensureDayReflectionsReady();
	return getDayReflectionRepository().loadAll();
}

export async function loadDayReflectionTombstones(): Promise<Tombstone[]> {
	await ensureDayReflectionsReady();
	return getDayReflectionRepository().loadTombstones();
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

export async function replaceDayReflections(
	reflections: DayReflection[],
	tombstones: Tombstone[]
): Promise<void> {
	await ensureDayReflectionsReady();
	await getDayReflectionRepository().replace(reflections, tombstones);
}
