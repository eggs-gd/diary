import type { DayReflection } from '$lib/events/types';
import { loadDayReflections, saveDayReflection } from '$lib/storage';

export class DayReflectionStore {
	reflections = $state<DayReflection[]>([]);
	loaded = $state(false);

	byDayKey = $derived.by(() => new Map(this.reflections.map((reflection) => [reflection.dayKey, reflection])));

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
	}
}

export const dayReflectionStore = new DayReflectionStore();
