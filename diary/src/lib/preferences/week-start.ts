import { browser } from '$app/environment';
import type { Locale } from '$lib/events/types';

export type WeekStart = 0 | 1;
export type WeekStartPreference = 'auto' | WeekStart;

export const WEEK_START_STORAGE_KEY = 'guanming.weekStart';

export const WEEK_START_OPTIONS: WeekStart[] = [1, 0];

export function defaultWeekStart(locale: Locale): WeekStart {
	return locale === 'uk' ? 1 : 0;
}

export function resolveWeekStart(preference: WeekStartPreference, locale: Locale): WeekStart {
	return preference === 'auto' ? defaultWeekStart(locale) : preference;
}

export function detectWeekStartPreference(): WeekStartPreference {
	if (!browser) return 'auto';

	const saved = localStorage.getItem(WEEK_START_STORAGE_KEY);
	const parsed = saved ? parseWeekStart(saved) : null;
	if (parsed !== null) return parsed;
	return 'auto';
}

export function parseWeekStart(value: string): WeekStart | null {
	if (value === '0') return 0;
	if (value === '1') return 1;
	return null;
}
