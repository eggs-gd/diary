import type { CollectionSnapshot, DayReflection } from '$lib/events/types';
import {
	deleteDayReflections,
	loadDayReflections,
	loadDayReflectionTombstones,
	replaceDayReflections,
	saveDayReflection
} from '$lib/storage';

export class DayReflectionStore {
	reflections = $state<DayReflection[]>([]);
	loaded = $state(false);

	byDayKey = $derived.by(
		() => new Map(this.reflections.map((reflection) => [reflection.dayKey, reflection]))
	);

	/** Set by the sync controller; fires after user-initiated mutations only. */
	#onMutate: (() => void) | null = null;

	setMutationListener(fn: (() => void) | null): void {
		this.#onMutate = fn;
	}

	async load(): Promise<void> {
		this.reflections = await loadDayReflections();
		this.loaded = true;
	}

	get(dayKey: string): DayReflection | undefined {
		return this.byDayKey.get(dayKey);
	}

	async save(reflection: DayReflection): Promise<void> {
		await saveDayReflection(reflection);
		this.reflections = [
			reflection,
			...this.reflections.filter((item) => item.dayKey !== reflection.dayKey)
		];
		this.#onMutate?.();
	}

	async deleteByDayKeys(dayKeys: string[]): Promise<void> {
		if (dayKeys.length === 0) return;
		await deleteDayReflections(dayKeys);
		const remove = new Set(dayKeys);
		this.reflections = this.reflections.filter((reflection) => !remove.has(reflection.dayKey));
		this.#onMutate?.();
	}

	async snapshot(): Promise<CollectionSnapshot<DayReflection>> {
		return { items: this.reflections, tombstones: await loadDayReflectionTombstones() };
	}

	/** Apply a merged snapshot from sync. Does not fire the mutation listener. */
	async applyMerged(snapshot: CollectionSnapshot<DayReflection>): Promise<void> {
		await replaceDayReflections(snapshot.items, snapshot.tombstones);
		this.reflections = await loadDayReflections();
	}
}

export const dayReflectionStore = new DayReflectionStore();
