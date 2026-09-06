import type { DayReflection, Tombstone } from '$lib/events/types';

export interface DayReflectionRepository {
	ensureReady(): Promise<void>;
	loadAll(): Promise<DayReflection[]>;
	loadTombstones(): Promise<Tombstone[]>;
	save(reflection: DayReflection): Promise<void>;
	/** Removes the reflections and records tombstones (kept forever, regardless of auth). */
	deleteByDayKeys(dayKeys: string[]): Promise<void>;
	/** Removes every reflection and tombstones each dayKey. */
	clear(): Promise<void>;
	/** Wholesale replace of both sets — used by sync after a merge. */
	replace(reflections: DayReflection[], tombstones: Tombstone[]): Promise<void>;
}

export const DAY_REFLECTIONS_STORAGE_KEY = 'guanming.day-reflections.v1';
export const DAY_REFLECTION_TOMBSTONES_KEY = 'guanming.day-reflection-tombstones.v1';
export const DAY_REFLECTIONS_MIGRATED_KEY = 'guanming_day_reflections_migrated';
