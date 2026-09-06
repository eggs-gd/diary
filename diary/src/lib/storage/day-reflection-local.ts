import type { DayReflection, Tombstone } from '$lib/events/types';
import {
	DAY_REFLECTIONS_STORAGE_KEY,
	DAY_REFLECTION_TOMBSTONES_KEY,
	type DayReflectionRepository
} from './day-reflection-repository';
import { mergeTombstones, tombstonesFor } from './tombstones';

function isDayReflection(value: unknown): value is DayReflection {
	if (!value || typeof value !== 'object') return false;
	const reflection = value as Partial<DayReflection>;
	return (
		typeof reflection.dayKey === 'string' &&
		typeof reflection.nextActions === 'string' &&
		typeof reflection.insights === 'string' &&
		typeof reflection.updatedAt === 'string' &&
		(reflection.score === undefined || typeof reflection.score === 'number') &&
		(reflection.nextActionsEdited === undefined ||
			typeof reflection.nextActionsEdited === 'boolean') &&
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

	async loadTombstones(): Promise<Tombstone[]> {
		if (typeof localStorage === 'undefined') return [];
		try {
			const raw = localStorage.getItem(DAY_REFLECTION_TOMBSTONES_KEY);
			return raw ? (JSON.parse(raw) as Tombstone[]) : [];
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

	async deleteByDayKeys(dayKeys: string[]): Promise<void> {
		if (typeof localStorage === 'undefined' || dayKeys.length === 0) return;
		await this.#removeAndTombstone(dayKeys);
	}

	async clear(): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		const dayKeys = (await this.loadAll()).map((r) => r.dayKey);
		await this.#removeAndTombstone(dayKeys);
	}

	async replace(reflections: DayReflection[], tombstones: Tombstone[]): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(DAY_REFLECTIONS_STORAGE_KEY, JSON.stringify(reflections));
		localStorage.setItem(
			DAY_REFLECTION_TOMBSTONES_KEY,
			JSON.stringify(mergeTombstones(tombstones))
		);
	}

	async #removeAndTombstone(dayKeys: string[]): Promise<void> {
		const remove = new Set(dayKeys);
		const reflections = (await this.loadAll()).filter((r) => !remove.has(r.dayKey));
		localStorage.setItem(DAY_REFLECTIONS_STORAGE_KEY, JSON.stringify(reflections));

		const tombstones = mergeTombstones(
			await this.loadTombstones(),
			tombstonesFor(dayKeys, new Date().toISOString())
		);
		localStorage.setItem(DAY_REFLECTION_TOMBSTONES_KEY, JSON.stringify(tombstones));
	}
}
