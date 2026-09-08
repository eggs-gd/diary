import { normalizeEventKind } from './event-kind';
import type { ReflectStatusIcon } from './reflection-status';
import { clampScore } from './score-picker';
import type { DayReflection, EventEntry } from './types';

export function effectiveEntryScore(entry: EventEntry): number {
	return entry.protocol?.reflectionScore ?? entry.score;
}

export function isDayReflectionComplete(reflection: DayReflection): boolean {
	return reflection.nextActions.trim().length > 0 && reflection.insights.trim().length > 0;
}

export type DayReflectionCalendarState = 'not_started' | 'partial' | 'complete';

export function dayReflectionActionIcon(state: DayReflectionCalendarState): ReflectStatusIcon {
	if (state === 'complete') return 'reflectComplete';
	if (state === 'partial') return 'reflectPartial';
	return 'reflectEmpty';
}

export function hasUserEditedAnyReflectionField(reflection: DayReflection): boolean {
	return reflection.nextActionsEdited === true || reflection.insightsEdited === true;
}

export function getDayReflectionCalendarState(
	reflection: DayReflection | undefined
): DayReflectionCalendarState {
	if (!reflection || !hasUserEditedAnyReflectionField(reflection)) {
		return 'not_started';
	}

	if (isDayReflectionComplete(reflection)) {
		return 'complete';
	}

	return 'partial';
}

export function reflectionCalendarStateByDay(
	reflections: DayReflection[]
): Map<string, DayReflectionCalendarState> {
	const map = new Map<string, DayReflectionCalendarState>();
	for (const reflection of reflections) {
		map.set(reflection.dayKey, getDayReflectionCalendarState(reflection));
	}
	return map;
}

export function completedReflectionDayKeys(reflections: DayReflection[]): Set<string> {
	return new Set(
		reflections.filter(isDayReflectionComplete).map((reflection) => reflection.dayKey)
	);
}

export interface DayReflectionDraft {
	nextActions: string;
	insights: string;
	nextActionsEdited: boolean;
	insightsEdited: boolean;
}

export function hasDayReflectionChanges(
	current: DayReflectionDraft,
	baseline: DayReflectionDraft
): boolean {
	return (
		current.nextActions.trim() !== baseline.nextActions.trim() ||
		current.insights.trim() !== baseline.insights.trim() ||
		current.nextActionsEdited !== baseline.nextActionsEdited ||
		current.insightsEdited !== baseline.insightsEdited
	);
}

export interface ClassifiedDayEntries {
	positiveEvents: EventEntry[];
	negativeEvents: EventEntry[];
	positiveActs: EventEntry[];
	negativeActs: EventEntry[];
}

export function classifyDayEntries(entries: EventEntry[]): ClassifiedDayEntries {
	const positiveEvents: EventEntry[] = [];
	const negativeEvents: EventEntry[] = [];
	const positiveActs: EventEntry[] = [];
	const negativeActs: EventEntry[] = [];

	for (const entry of entries) {
		const kind = normalizeEventKind(entry.kind);
		const positive = effectiveEntryScore(entry) > 0;

		if (kind === 'event') {
			(positive ? positiveEvents : negativeEvents).push(entry);
		} else {
			(positive ? positiveActs : negativeActs).push(entry);
		}
	}

	return { positiveEvents, negativeEvents, positiveActs, negativeActs };
}

export function defaultDayScoreFromEntries(entries: EventEntry[]): number {
	if (entries.length === 0) return 0;

	const normalizedSum = entries.reduce((sum, entry) => {
		const score = effectiveEntryScore(entry);
		return sum + Math.sign(score) * Math.sqrt(Math.abs(score));
	}, 0);

	return clampScore(normalizedSum);
}

export function resolveDayScore(entries: EventEntry[]): number {
	return defaultDayScoreFromEntries(entries);
}

export function emptyDayReflection(dayKey: string): DayReflection {
	return {
		dayKey,
		nextActions: '',
		insights: '',
		updatedAt: new Date().toISOString()
	};
}
