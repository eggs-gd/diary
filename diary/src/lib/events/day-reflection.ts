import { normalizeEventKind } from './event-kind';
import type { ReflectStatusIcon } from './reflection-status';
import { clampScore } from './score-picker';
import type { DayReflection, EventEntry } from './types';

export function effectiveEntryScore(entry: EventEntry): number {
	return entry.protocol?.reflectionScore ?? entry.score;
}

export function isDayReflectionComplete(reflection: DayReflection): boolean {
	return (
		reflection.nextActions.trim().length > 0 &&
		reflection.insights.trim().length > 0 &&
		reflection.scoreEdited === true
	);
}

export type DayReflectionCalendarState = 'not_started' | 'partial' | 'complete';

export function dayReflectionActionIcon(state: DayReflectionCalendarState): ReflectStatusIcon {
	if (state === 'complete') return 'reflectComplete';
	if (state === 'partial') return 'reflectPartial';
	return 'reflectEmpty';
}

export function hasUserEditedAnyReflectionField(reflection: DayReflection): boolean {
	return (
		reflection.nextActionsEdited === true ||
		reflection.insightsEdited === true ||
		reflection.scoreEdited === true
	);
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
	return new Set(reflections.filter(isDayReflectionComplete).map((reflection) => reflection.dayKey));
}

export interface DayReflectionDraft {
	nextActions: string;
	insights: string;
	score?: number;
	nextActionsEdited: boolean;
	insightsEdited: boolean;
	scoreEdited: boolean;
}

export function hasDayReflectionChanges(
	current: DayReflectionDraft,
	baseline: DayReflectionDraft
): boolean {
	const currentScore = clampScore(current.score ?? 0);
	const baselineScore = clampScore(baseline.score ?? 0);

	return (
		current.nextActions.trim() !== baseline.nextActions.trim() ||
		current.insights.trim() !== baseline.insights.trim() ||
		currentScore !== baselineScore ||
		current.nextActionsEdited !== baseline.nextActionsEdited ||
		current.insightsEdited !== baseline.insightsEdited ||
		current.scoreEdited !== baseline.scoreEdited
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

	const scores = entries.map(effectiveEntryScore).sort((a, b) => a - b);
	const mid = Math.floor(scores.length / 2);
	const median =
		scores.length % 2 === 0 ? (scores[mid - 1]! + scores[mid]!) / 2 : scores[mid]!;

	return clampScore(median);
}

export function resolveDayScore(
	saved: DayReflection | null | undefined,
	entries: EventEntry[]
): number {
	if (saved?.score !== undefined) {
		return clampScore(saved.score);
	}

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
