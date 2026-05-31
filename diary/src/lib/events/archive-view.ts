import type { ReflectionTone } from '$lib/preferences/reflection-tone';
import { dayReflectionDisplayIcon } from './reflection-display';
import { getDayReflectionCalendarState, type DayReflectionCalendarState } from './day-reflection';
import { groupEventEntries } from './grouping';
import { medianEventScore } from './period-score';
import type { DayReflection, EventEntry, Locale } from './types';

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
	reflectionTone: ReflectionTone
): ArchiveYearView[] {
	return groupEventEntries(entries, locale).map((year) => {
		const yearEntries: EventEntry[] = [];
		const months = year.months.map((month) => {
			const monthEntries: EventEntry[] = [];
			const days = month.days.map((day) => {
				monthEntries.push(...day.entries);
				yearEntries.push(...day.entries);

				const reflectionState = getDayReflectionCalendarState(dayReflections.get(day.key));
				return {
					...day,
					score: medianEventScore(day.entries),
					reflectionState,
					reflectionIcon: dayReflectionDisplayIcon(reflectionTone, reflectionState)
				};
			});

			return {
				key: month.key,
				label: month.label,
				days,
				score: medianEventScore(monthEntries)
			};
		});

		return {
			key: year.key,
			label: year.label,
			months,
			score: medianEventScore(yearEntries)
		};
	});
}
