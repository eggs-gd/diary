import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getContext, setContext } from 'svelte';

export const REFLECTION_ENABLED_STORAGE_KEY = 'guanming.reflectionEnabled';

const REFLECTION_ENABLED_KEY = Symbol('reflectionEnabled');
const DEFAULT_REFLECTION_ENABLED = false;

function parseStoredReflectionEnabled(value: string | null): boolean | null {
	if (value === 'true') return true;
	if (value === 'false') return false;
	return null;
}

function detectReflectionEnabled(): boolean {
	if (!browser) return DEFAULT_REFLECTION_ENABLED;
	return (
		parseStoredReflectionEnabled(localStorage.getItem(REFLECTION_ENABLED_STORAGE_KEY)) ??
		DEFAULT_REFLECTION_ENABLED
	);
}

export class ReflectionEnabledStore {
	enabled = $state(detectReflectionEnabled());

	setEnabled(next: boolean): void {
		this.enabled = next;
		const stored = String(next);
		if (browser) {
			localStorage.setItem(REFLECTION_ENABLED_STORAGE_KEY, stored);
		}
		if (Capacitor.isNativePlatform()) {
			void Preferences.set({ key: REFLECTION_ENABLED_STORAGE_KEY, value: stored });
		}
	}
}

async function hydrateReflectionEnabledFromPreferences(
	store: ReflectionEnabledStore
): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	const { value } = await Preferences.get({ key: REFLECTION_ENABLED_STORAGE_KEY });
	const parsed = parseStoredReflectionEnabled(value);
	if (parsed !== null) {
		store.enabled = parsed;
	}
}

export function initReflectionEnabled(): ReflectionEnabledStore {
	const store = new ReflectionEnabledStore();
	setContext(REFLECTION_ENABLED_KEY, store);
	void hydrateReflectionEnabledFromPreferences(store);
	return store;
}

export function useReflectionEnabled(): ReflectionEnabledStore {
	return getContext<ReflectionEnabledStore>(REFLECTION_ENABLED_KEY);
}
