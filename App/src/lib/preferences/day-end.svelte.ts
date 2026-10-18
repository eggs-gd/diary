import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getContext, setContext } from 'svelte';
import { DAY_END_STORAGE_KEY, detectDayEndHour, parseDayEndHour, type DayEndHour } from './day-end';

const DAY_END_KEY = Symbol('dayEnd');

export class DayEndStore {
	hour = $state<DayEndHour>(detectDayEndHour());

	setHour(next: DayEndHour): void {
		this.hour = next;
		const stored = String(next);
		if (browser) {
			localStorage.setItem(DAY_END_STORAGE_KEY, stored);
		}
		if (Capacitor.isNativePlatform()) {
			void Preferences.set({ key: DAY_END_STORAGE_KEY, value: stored });
		}
	}
}

async function hydrateDayEndFromPreferences(store: DayEndStore): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	const { value } = await Preferences.get({ key: DAY_END_STORAGE_KEY });
	const parsed = value ? parseDayEndHour(value) : null;
	if (parsed !== null) {
		store.hour = parsed;
	}
}

export function initDayEnd(): DayEndStore {
	const store = new DayEndStore();
	setContext(DAY_END_KEY, store);
	void hydrateDayEndFromPreferences(store);
	return store;
}

export function useDayEnd(): DayEndStore {
	return getContext<DayEndStore>(DAY_END_KEY);
}
