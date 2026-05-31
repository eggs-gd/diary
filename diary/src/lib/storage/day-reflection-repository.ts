import type { DayReflection } from '$lib/events/types';

export interface DayReflectionRepository {
	ensureReady(): Promise<void>;
	loadAll(): Promise<DayReflection[]>;
	save(reflection: DayReflection): Promise<void>;
	deleteByDayKeys(dayKeys: string[]): Promise<void>;
	clear(): Promise<void>;
}

export const DAY_REFLECTIONS_STORAGE_KEY = 'guanming.day-reflections.v1';
export const DAY_REFLECTIONS_MIGRATED_KEY = 'guanming_day_reflections_migrated';
