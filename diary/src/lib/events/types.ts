export const LOCALES = ['uk', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export interface EventEntry {
	id: string;
	text: string;
	score: number;
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
