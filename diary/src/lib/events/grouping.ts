import type { EventEntry, Locale, YearGroup } from './types';

function dateLocale(locale: Locale): string {
	return locale === 'uk' ? 'uk-UA' : 'en-US';
}

export function localDateKey(iso: string): string {
	const d = new Date(iso);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function formatDayLabel(dayKey: string, locale: Locale): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
	if (!match) return dayKey;

	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return date.toLocaleDateString(dateLocale(locale), {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
}

export function entriesForDay(entries: EventEntry[], dayKey: string): EventEntry[] {
	return entries.filter((entry) => localDateKey(entry.createdAt) === dayKey);
}

export function createdAtForDayKey(dayKey: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
	if (!match) return new Date().toISOString();

	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0).toISOString();
}

export function groupEventEntries(entries: EventEntry[], locale: Locale): YearGroup[] {
	const years: YearGroup[] = [];
	const yearIndex = new Map<string, YearGroup>();
	const monthIndex = new Map<string, YearGroup['months'][number]>();
	const dayIndex = new Map<string, YearGroup['months'][number]['days'][number]>();
	const resolvedLocale = dateLocale(locale);

	for (const entry of entries) {
		const date = new Date(entry.createdAt);
		const yearKey = String(date.getFullYear());
		const monthKey = `${yearKey}-${date.getMonth()}`;
		const dayKey = localDateKey(entry.createdAt);

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
