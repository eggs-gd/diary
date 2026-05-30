import { browser } from '$app/environment';
import type { Locale } from '$lib/events/types';
import { LOCALES } from '$lib/events/types';
import en from './locales/en.json';
import uk from './locales/uk.json';

export const LOCALE_STORAGE_KEY = 'guanming.locale';

export type TranslationParams = Record<string, string | number>;

type Dictionary = typeof uk;

const dictionaries: Record<Locale, Dictionary> = { uk, en };

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce<unknown>((current, key) => {
		if (current && typeof current === 'object' && key in current) {
			return (current as Record<string, unknown>)[key];
		}
		return undefined;
	}, obj);
}

function interpolate(template: string, params?: TranslationParams): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function detectLocale(): Locale {
	if (browser) {
		const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
		if (saved && LOCALES.includes(saved as Locale)) {
			return saved as Locale;
		}

		if (navigator.language.toLowerCase().startsWith('uk')) return 'uk';
	}

	return 'uk';
}

export function translate(locale: Locale, key: string, params?: TranslationParams): string {
	const value =
		getNestedValue(dictionaries[locale] as Record<string, unknown>, key) ??
		getNestedValue(dictionaries.uk as Record<string, unknown>, key);
	if (typeof value !== 'string') return key;
	return interpolate(value, params);
}

export function getLocaleDateFormat(locale: Locale): string {
	return locale === 'uk' ? 'uk-UA' : 'en-GB';
}
