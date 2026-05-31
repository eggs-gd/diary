import { monthKey } from './calendar';
import { defaultDayScoreFromEntries } from './day-reflection';
import type { EventEntry, MonthGroup, YearGroup } from './types';

/** Median (50th percentile) effective score for events in a period. */
export function medianEventScore(entries: EventEntry[]): number | null {
	if (entries.length === 0) return null;
	return defaultDayScoreFromEntries(entries);
}

export function flattenMonthEntries(month: MonthGroup): EventEntry[] {
	return month.days.flatMap((day) => day.entries);
}

export function flattenYearEntries(year: YearGroup): EventEntry[] {
	return year.months.flatMap((month) => flattenMonthEntries(month));
}

export function medianEventScoreByMonth(entries: EventEntry[]): Map<string, number> {
	const grouped = new Map<string, EventEntry[]>();

	for (const entry of entries) {
		const date = new Date(entry.createdAt);
		const key = monthKey(date.getFullYear(), date.getMonth());
		const list = grouped.get(key) ?? [];
		list.push(entry);
		grouped.set(key, list);
	}

	const scores = new Map<string, number>();
	for (const [key, list] of grouped) {
		scores.set(key, defaultDayScoreFromEntries(list));
	}

	return scores;
}
