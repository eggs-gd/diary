import type { DayReflection } from '$lib/events/types';
import {
	DAY_REFLECTIONS_STORAGE_KEY,
	type DayReflectionRepository
} from './day-reflection-repository';

function isDayReflection(value: unknown): value is DayReflection {
	if (!value || typeof value !== 'object') return false;
	const reflection = value as Partial<DayReflection>;
	return (
		typeof reflection.dayKey === 'string' &&
		typeof reflection.nextActions === 'string' &&
		typeof reflection.insights === 'string' &&
		typeof reflection.updatedAt === 'string' &&
		(reflection.score === undefined || typeof reflection.score === 'number') &&
		(reflection.nextActionsEdited === undefined || typeof reflection.nextActionsEdited === 'boolean') &&
		(reflection.insightsEdited === undefined || typeof reflection.insightsEdited === 'boolean') &&
		(reflection.scoreEdited === undefined || typeof reflection.scoreEdited === 'boolean')
	);
}

export class LocalDayReflectionRepository implements DayReflectionRepository {
	async ensureReady(): Promise<void> {
		// localStorage is available in browser contexts we target.
	}

	async loadAll(): Promise<DayReflection[]> {
		if (typeof localStorage === 'undefined') return [];

		try {
			const raw = localStorage.getItem(DAY_REFLECTIONS_STORAGE_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw) as unknown;
			return Array.isArray(parsed) ? parsed.filter(isDayReflection) : [];
		} catch {
			return [];
		}
	}

	async save(reflection: DayReflection): Promise<void> {
		if (typeof localStorage === 'undefined') return;

		const reflections = await this.loadAll();
		const idx = reflections.findIndex((item) => item.dayKey === reflection.dayKey);
		if (idx >= 0) {
			reflections[idx] = reflection;
		} else {
			reflections.push(reflection);
		}
		localStorage.setItem(DAY_REFLECTIONS_STORAGE_KEY, JSON.stringify(reflections));
	}

	async clear(): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		localStorage.removeItem(DAY_REFLECTIONS_STORAGE_KEY);
	}
}
