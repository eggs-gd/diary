import { browser } from '$app/environment';

export type DayEndHour = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_END_STORAGE_KEY = 'guanming.dayEndHour';
export const DAY_END_OPTIONS: DayEndHour[] = [0, 1, 2, 3, 4, 5, 6];

export function parseDayEndHour(value: string): DayEndHour | null {
	const parsed = Number(value);
	return DAY_END_OPTIONS.includes(parsed as DayEndHour) ? (parsed as DayEndHour) : null;
}

export function detectDayEndHour(): DayEndHour {
	if (!browser) return 0;

	const saved = localStorage.getItem(DAY_END_STORAGE_KEY);
	const parsed = saved ? parseDayEndHour(saved) : null;
	return parsed ?? 0;
}

export function formatDayEndHour(value: DayEndHour): string {
	return `${String(value).padStart(2, '0')}:00`;
}
