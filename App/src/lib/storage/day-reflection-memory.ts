import type { DayReflection, Tombstone } from '$lib/events/types';
import type { DayReflectionRepository } from './day-reflection-repository';
import { mergeTombstones, tombstonesFor } from './tombstones';

/** Session-only day reflections (see MemoryEventRepository). */
export class MemoryDayReflectionRepository implements DayReflectionRepository {
	#reflections: DayReflection[] = [];
	#tombstones: Tombstone[] = [];

	async ensureReady(): Promise<void> {}

	async loadAll(): Promise<DayReflection[]> {
		return [...this.#reflections];
	}

	async loadTombstones(): Promise<Tombstone[]> {
		return [...this.#tombstones];
	}

	async save(reflection: DayReflection): Promise<void> {
		const idx = this.#reflections.findIndex((item) => item.dayKey === reflection.dayKey);
		if (idx >= 0) this.#reflections[idx] = reflection;
		else this.#reflections.unshift(reflection);
	}

	async deleteByDayKeys(dayKeys: string[]): Promise<void> {
		if (dayKeys.length === 0) return;
		this.#removeAndTombstone(dayKeys);
	}

	async clear(): Promise<void> {
		this.#removeAndTombstone(this.#reflections.map((r) => r.dayKey));
	}

	async replace(reflections: DayReflection[], tombstones: Tombstone[]): Promise<void> {
		this.#reflections = [...reflections];
		this.#tombstones = mergeTombstones(tombstones);
	}

	#removeAndTombstone(dayKeys: string[]): void {
		const remove = new Set(dayKeys);
		this.#reflections = this.#reflections.filter((item) => !remove.has(item.dayKey));
		this.#tombstones = mergeTombstones(
			this.#tombstones,
			tombstonesFor(dayKeys, new Date().toISOString())
		);
	}
}
