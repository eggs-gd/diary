import type { Locale } from './types';
import type { WeekStart } from '$lib/preferences/week-start';
import { localDateKey } from './grouping';

export interface CalendarCell {
	key: string;
	day: number;
	inMonth: boolean;
	count: number;
	isToday: boolean;
}

function dateKeyFromParts(year: number, month: number, day: number): string {
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function entryCountsByDay(dates: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const iso of dates) {
		const key = localDateKey(iso);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

export function buildMonthCells(
	year: number,
	month: number,
	counts: Map<string, number>,
	todayKey: string,
	weekStartsOn: WeekStart
): CalendarCell[] {
	const first = new Date(year, month, 1);
	const firstWeekday = (first.getDay() - weekStartsOn + 7) % 7;
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const cells: CalendarCell[] = [];

	for (let index = 0; index < firstWeekday; index += 1) {
		cells.push({
			key: `${monthKey(year, month)}-pad-start-${index}`,
			day: 0,
			inMonth: false,
			count: 0,
			isToday: false
		});
	}

	for (let day = 1; day <= daysInMonth; day += 1) {
		const key = dateKeyFromParts(year, month, day);
		cells.push({
			key,
			day,
			inMonth: true,
			count: counts.get(key) ?? 0,
			isToday: key === todayKey
		});
	}

	let padIndex = 0;
	while (cells.length % 7 !== 0) {
		cells.push({
			key: `${monthKey(year, month)}-pad-end-${padIndex}`,
			day: 0,
			inMonth: false,
			count: 0,
			isToday: false
		});
		padIndex += 1;
	}

	return cells;
}

export function weekdayLabels(locale: Locale, weekStartsOn: WeekStart): string[] {
	const resolved = locale === 'uk' ? 'uk-UA' : 'en-US';
	const formatter = new Intl.DateTimeFormat(resolved, { weekday: 'short' });
	// Jan 1 2023 was Sunday — anchor for weekStartsOn 0/1.
	const start = new Date(2023, 0, 1 + weekStartsOn);

	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		return formatter.format(date);
	});
}

export function monthLabel(year: number, month: number, locale: Locale): string {
	const resolved = locale === 'uk' ? 'uk-UA' : 'en-US';
	return new Date(year, month, 1).toLocaleDateString(resolved, {
		month: 'long',
		year: 'numeric'
	});
}

export function monthKey(year: number, month: number): string {
	return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
	const [year, month] = key.split('-').map(Number);
	return { year, month: month - 1 };
}

export function addMonths(
	year: number,
	month: number,
	delta: number
): { year: number; month: number } {
	const date = new Date(year, month + delta, 1);
	return { year: date.getFullYear(), month: date.getMonth() };
}

export type CalendarMonth = { year: number; month: number };

export function compareMonths(a: CalendarMonth, b: CalendarMonth): number {
	return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

export function calendarMonthBounds(entryDates: string[]): {
	start: CalendarMonth;
	end: CalendarMonth;
} {
	const { min, max } = calendarYearBounds(entryDates);
	return {
		start: { year: min, month: 0 },
		end: { year: max, month: 11 }
	};
}

export function clampCalendarMonth(
	month: CalendarMonth,
	bounds: { start: CalendarMonth; end: CalendarMonth }
): CalendarMonth {
	if (compareMonths(month, bounds.start) < 0) return bounds.start;
	if (compareMonths(month, bounds.end) > 0) return bounds.end;
	return month;
}

export function iterMonthKeys(
	start: { year: number; month: number },
	end: { year: number; month: number }
): string[] {
	const keys: string[] = [];
	let cursor = { ...start };
	const endKey = monthKey(end.year, end.month);

	while (true) {
		const key = monthKey(cursor.year, cursor.month);
		keys.push(key);
		if (key === endKey) break;
		cursor = addMonths(cursor.year, cursor.month, 1);
	}

	return keys;
}

export function monthSelectOptions(locale: Locale): { value: number; label: string }[] {
	const resolved = locale === 'uk' ? 'uk-UA' : 'en-US';
	const formatter = new Intl.DateTimeFormat(resolved, { month: 'long' });

	return Array.from({ length: 12 }, (_, month) => ({
		value: month,
		label: formatter.format(new Date(2024, month, 1))
	}));
}

export function calendarYearBounds(entryDates: string[]): { min: number; max: number } {
	const now = new Date().getFullYear();
	let min = now;
	let max = now;

	for (const iso of entryDates) {
		const year = new Date(iso).getFullYear();
		min = Math.min(min, year);
		max = Math.max(max, year);
	}

	return { min: min - 1, max: max + 1 };
}

export function todayKey(): string {
	return localDateKey(new Date().toISOString());
}
