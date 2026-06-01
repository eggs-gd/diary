import { monthKey } from './calendar';
import { defaultDayScoreFromEntries } from './day-reflection';
import { localDateKey } from './grouping';
import type { EventEntry, MonthGroup, YearGroup } from './types';

export function averageScores(scores: Array<number | null | undefined>): number | null {
	const values = scores.filter((score): score is number => score !== null && score !== undefined);
	if (values.length === 0) return null;
	return Math.round(values.reduce((sum, score) => sum + score, 0) / values.length);
}

/** Automatic effective score for a single day of events. */
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
	const grouped = new Map<string, Map<string, EventEntry[]>>();

	for (const entry of entries) {
		const date = new Date(entry.createdAt);
		const key = monthKey(date.getFullYear(), date.getMonth());
		const dayKey = localDateKey(entry.createdAt);
		const month = grouped.get(key) ?? new Map<string, EventEntry[]>();
		const day = month.get(dayKey) ?? [];
		day.push(entry);
		month.set(dayKey, day);
		grouped.set(key, month);
	}

	const scores = new Map<string, number>();
	for (const [key, days] of grouped) {
		const score = averageScores([...days.values()].map(defaultDayScoreFromEntries));
		if (score !== null) {
			scores.set(key, score);
		}
	}

	return scores;
}
