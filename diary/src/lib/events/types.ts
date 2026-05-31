import type { EventKind } from './event-kind';

export const LOCALES = ['uk', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export type { EventKind } from './event-kind';
export { DEFAULT_EVENT_KIND, normalizeEventKind } from './event-kind';

export interface EventEntry {
	id: string;
	text: string;
	score: number;
	kind: EventKind;
	createdAt: string;
	protocol?: ReflectionProtocol;
}

export interface ReflectionProtocol {
	event: string;
	reason: string;
	about: string;
	view: string;
	actions: string;
	reflectionScore?: number;
}

export interface DayGroup {
	key: string;
	label: string;
	entries: EventEntry[];
}

export interface MonthGroup {
	key: string;
	label: string;
	days: DayGroup[];
}

export interface YearGroup {
	key: string;
	label: string;
	months: MonthGroup[];
}

export interface DayReflection {
	dayKey: string;
	nextActions: string;
	insights: string;
	score?: number;
	nextActionsEdited?: boolean;
	insightsEdited?: boolean;
	scoreEdited?: boolean;
	updatedAt: string;
}
