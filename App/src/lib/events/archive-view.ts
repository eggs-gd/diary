import { dayReflectionDisplayIcon } from './reflection-display';
import { getDayReflectionCalendarState, type DayReflectionCalendarState } from './day-reflection';
import { groupEventEntries } from './grouping';
import { averageScores, medianEventScore } from './period-score';
import type { DayReflection, EventEntry, Locale } from './types';
import type { DayEndHour } from '$lib/preferences/day-end';

export interface ArchiveDayView {
	key: string;
	label: string;
	entries: EventEntry[];
	score: number | null;
	reflectionState: DayReflectionCalendarState;
	reflectionIcon: ReturnType<typeof dayReflectionDisplayIcon>;
}

export interface ArchiveMonthView {
	key: string;
	label: string;
	days: ArchiveDayView[];
	score: number | null;
}

export interface ArchiveYearView {
	key: string;
	label: string;
	months: ArchiveMonthView[];
	score: number | null;
}

export function buildArchiveView(
	entries: EventEntry[],
	locale: Locale,
	dayReflections: Map<string, DayReflection>,
	dayEndHour: DayEndHour = 0
): ArchiveYearView[] {
	return groupEventEntries(entries, locale, dayEndHour).map((year) => {
		const yearDayScores: number[] = [];
		const months = year.months.map((month) => {
			const days = month.days.map((day) => {
				const reflectionState = getDayReflectionCalendarState(dayReflections.get(day.key));
				const score = medianEventScore(day.entries);
				if (score !== null) yearDayScores.push(score);

				return {
					...day,
					score,
					reflectionState,
					reflectionIcon: dayReflectionDisplayIcon(reflectionState)
				};
			});

			return {
				key: month.key,
				label: month.label,
				days,
				score: averageScores(days.map((day) => day.score))
			};
		});

		return {
			key: year.key,
			label: year.label,
			months,
			score: averageScores(yearDayScores)
		};
	});
}
