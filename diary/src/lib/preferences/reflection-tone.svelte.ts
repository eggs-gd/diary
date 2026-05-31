import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getContext, setContext } from 'svelte';
import {
	detectReflectionTone,
	parseReflectionTone,
	REFLECTION_TONE_STORAGE_KEY,
	type ReflectionTone
} from './reflection-tone';

const REFLECTION_TONE_KEY = Symbol('reflectionTone');

export class ReflectionToneStore {
	preference = $state<ReflectionTone>(detectReflectionTone());

	setTone(next: ReflectionTone): void {
		this.preference = next;
		if (browser) {
			localStorage.setItem(REFLECTION_TONE_STORAGE_KEY, next);
		}
		if (Capacitor.isNativePlatform()) {
			void Preferences.set({ key: REFLECTION_TONE_STORAGE_KEY, value: next });
		}
	}
}

async function hydrateReflectionToneFromPreferences(store: ReflectionToneStore): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	const { value } = await Preferences.get({ key: REFLECTION_TONE_STORAGE_KEY });
	const parsed = value ? parseReflectionTone(value) : null;
	if (parsed !== null) {
		store.preference = parsed;
	}
}

export function initReflectionTone(): ReflectionToneStore {
	const store = new ReflectionToneStore();
	setContext(REFLECTION_TONE_KEY, store);
	void hydrateReflectionToneFromPreferences(store);
	return store;
}

export function useReflectionTone(): ReflectionToneStore {
	return getContext<ReflectionToneStore>(REFLECTION_TONE_KEY);
}
