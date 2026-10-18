import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getContext, setContext } from 'svelte';
import {
	detectWeekStartPreference,
	parseWeekStart,
	WEEK_START_STORAGE_KEY,
	type WeekStart,
	type WeekStartPreference
} from './week-start';

const WEEK_START_KEY = Symbol('weekStart');

export class WeekStartStore {
	preference = $state<WeekStartPreference>(detectWeekStartPreference());

	setWeekStart(next: WeekStart): void {
		this.preference = next;
		const stored = String(next);
		if (browser) {
			localStorage.setItem(WEEK_START_STORAGE_KEY, stored);
		}
		if (Capacitor.isNativePlatform()) {
			void Preferences.set({ key: WEEK_START_STORAGE_KEY, value: stored });
		}
	}
}

async function hydrateWeekStartFromPreferences(store: WeekStartStore): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	const { value } = await Preferences.get({ key: WEEK_START_STORAGE_KEY });
	const parsed = value ? parseWeekStart(value) : null;
	if (parsed !== null) {
		store.preference = parsed;
	}
}

export function initWeekStart(): WeekStartStore {
	const store = new WeekStartStore();
	setContext(WEEK_START_KEY, store);
	void hydrateWeekStartFromPreferences(store);
	return store;
}

export function useWeekStart(): WeekStartStore {
	return getContext<WeekStartStore>(WEEK_START_KEY);
}
