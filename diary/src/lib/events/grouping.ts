import type { EventEntry, Locale, YearGroup } from './types';
import { getLocaleDateFormat } from '$lib/i18n';
import type { DayEndHour } from '$lib/preferences/day-end';

function adjustedDate(value: string | Date, dayEndHour: DayEndHour = 0): Date {
	const d = value instanceof Date ? new Date(value) : new Date(value);
	if (dayEndHour > 0) {
		d.setHours(d.getHours() - dayEndHour);
	}
	return d;
}

export function localDateKey(iso: string, dayEndHour: DayEndHour = 0): string {
	const d = adjustedDate(iso, dayEndHour);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function localDateKeyFromDate(date: Date, dayEndHour: DayEndHour = 0): string {
	const d = adjustedDate(date, dayEndHour);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function formatDayLabel(dayKey: string, locale: Locale): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
	if (!match) return dayKey;

	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return date.toLocaleDateString(getLocaleDateFormat(locale), {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
}

export function entriesForDay(
	entries: EventEntry[],
	dayKey: string,
	dayEndHour: DayEndHour = 0
): EventEntry[] {
	return entries.filter((entry) => localDateKey(entry.createdAt, dayEndHour) === dayKey);
}

export function createdAtForDayKey(dayKey: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
	if (!match) return new Date().toISOString();

	return new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
		12,
		0,
		0,
		0
	).toISOString();
}

export function groupEventEntries(
	entries: EventEntry[],
	locale: Locale,
	dayEndHour: DayEndHour = 0
): YearGroup[] {
	const years: YearGroup[] = [];
	const yearIndex = new Map<string, YearGroup>();
	const monthIndex = new Map<string, YearGroup['months'][number]>();
	const dayIndex = new Map<string, YearGroup['months'][number]['days'][number]>();
	const resolvedLocale = getLocaleDateFormat(locale);

	for (const entry of entries) {
		const date = adjustedDate(entry.createdAt, dayEndHour);
		const yearKey = String(date.getFullYear());
		const monthKey = `${yearKey}-${date.getMonth()}`;
		const dayKey = localDateKey(entry.createdAt, dayEndHour);

		let year = yearIndex.get(yearKey);
		if (!year) {
			year = { key: yearKey, label: yearKey, months: [] };
			yearIndex.set(yearKey, year);
			years.push(year);
		}

		let month = monthIndex.get(monthKey);
		if (!month) {
			month = {
				key: monthKey,
				label: date.toLocaleDateString(resolvedLocale, { month: 'long', year: 'numeric' }),
				days: []
			};
			monthIndex.set(monthKey, month);
			year.months.push(month);
		}

		let day = dayIndex.get(dayKey);
		if (!day) {
			day = {
				key: dayKey,
				label: date.toLocaleDateString(resolvedLocale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long'
				}),
				entries: []
			};
			dayIndex.set(dayKey, day);
			month.days.push(day);
		}

		day.entries.push(entry);
	}

	return years;
}
