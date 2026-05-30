import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getContext, setContext } from 'svelte';
import type { Locale } from '$lib/events/types';
import {
	detectLocale,
	LOCALE_STORAGE_KEY,
	translate,
	type TranslationParams
} from './translations';

const I18N_KEY = Symbol('i18n');

export class I18nStore {
	locale = $state<Locale>(detectLocale());

	setLocale(next: Locale): void {
		this.locale = next;
		if (browser) {
			localStorage.setItem(LOCALE_STORAGE_KEY, next);
			document.documentElement.lang = next;
		}
		if (Capacitor.isNativePlatform()) {
			void Preferences.set({ key: LOCALE_STORAGE_KEY, value: next });
		}
	}

	t(key: string, params?: TranslationParams): string {
		return translate(this.locale, key, params);
	}
}

async function hydrateLocaleFromPreferences(store: I18nStore): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	const { value } = await Preferences.get({ key: LOCALE_STORAGE_KEY });
	if (value === 'uk' || value === 'en') {
		store.setLocale(value);
	}
}

export function initI18n(): I18nStore {
	const store = new I18nStore();
	setContext(I18N_KEY, store);
	if (browser) {
		document.documentElement.lang = store.locale;
	}
	void hydrateLocaleFromPreferences(store);
	return store;
}

export function useI18n(): I18nStore {
	return getContext<I18nStore>(I18N_KEY);
}
