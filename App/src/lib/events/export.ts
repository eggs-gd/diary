import type { DayReflection, EventEntry, Locale, ReflectionProtocol, YearGroup } from './types';
import { getLocaleDateFormat } from '$lib/i18n';
import { defaultDayScoreFromEntries } from './day-reflection';
import type { DayEndHour } from '$lib/preferences/day-end';

type Translator = (key: string, params?: Record<string, string | number>) => string;
export type ExportRange = 'today' | 'week' | 'month' | 'custom';
export type ExportMode = 'report' | 'agent';

/** Inclusive `YYYY-MM-DD` bounds for the `custom` range. */
export interface CustomRange {
	start: string;
	end: string;
}

function parseDayKey(value: string | undefined): { y: number; m: number; d: number } | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
	if (!match) return null;
	return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sl(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

function line(label: string, value: string | undefined): string {
	if (!value?.trim()) return '';
	return `**${label}** ${value.trim()}\n`;
}

// ─── Event protocol block ────────────────────────────────────────────────────

function protocolBlock(protocol: ReflectionProtocol, entryScore: number, t: Translator): string {
	const p = entryScore <= 0 ? 'negative' : 'positive';

	const rows = [
		line(t(`analysis.${p}Reason`), protocol.reason),
		line(t(`analysis.${p}About`), protocol.about),
		line(t(`analysis.${p}View`), protocol.view),
		line(t(`analysis.${p}Actions`), protocol.actions),
		protocol.reflectionScore !== undefined
			? `**${t('analysis.resonanceQuestion')}** ${sl(protocol.reflectionScore)}\n`
			: ''
	].filter(Boolean);

	if (!rows.length) return '';
	return `\n*${t('analysis.title')}*\n\n${rows.join('')}`;
}

// ─── Single event ────────────────────────────────────────────────────────────

function eventBlock(entry: EventEntry, t: Translator, dateLocale: string): string {
	const time = new Date(entry.createdAt).toLocaleTimeString(dateLocale, {
		hour: '2-digit',
		minute: '2-digit'
	});
	const kind = entry.kind === 'act' ? t('capture.kindAct') : t('capture.kindEvent');

	let md = `#### ${entry.text}\n\n`;
	md += `${kind} · ${sl(entry.score)} · ${time}\n`;

	if (entry.protocol) {
		const block = protocolBlock(entry.protocol, entry.score, t);
		if (block) md += block + '\n';
	}

	return md;
}

// ─── Day reflection block ────────────────────────────────────────────────────

function dayReflectionBlock(dr: DayReflection, entries: EventEntry[], t: Translator): string {
	const rows = [
		line(t('dayReflection.nextActions'), dr.nextActions),
		line(t('dayReflection.insights'), dr.insights),
		`**${t('dayReflection.dayScore')}** ${sl(defaultDayScoreFromEntries(entries))}\n`
	].filter(Boolean);

	if (!rows.length) return '';
	return `\n#### ${t('archive.dayReflectionTitle')}\n\n${rows.join('')}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function buildArchiveMarkdown(
	years: YearGroup[],
	dayReflections: Map<string, DayReflection>,
	t: Translator,
	locale: Locale
): string {
	const dateLocale = getLocaleDateFormat(locale);
	const totalEntries = years.reduce(
		(sum, y) =>
			sum + y.months.reduce((ms, m) => ms + m.days.reduce((ds, d) => ds + d.entries.length, 0), 0),
		0
	);
	const exportedAt = new Date().toLocaleDateString(dateLocale, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	let md = `# ${t('archive.title')}\n\n`;
	md += `${totalEntries} ${t('archive.exportCount')} · ${exportedAt}\n\n---\n`;

	for (const year of years) {
		md += `\n# ${year.label}\n`;

		for (const month of year.months) {
			md += `\n## ${month.label}\n`;

			for (const day of month.days) {
				// Parse day key to build a proper date label
				const [y, mo, d] = day.key.split('-').map(Number);
				const dayDate = new Date(y, mo - 1, d);
				const dayLabel = dayDate.toLocaleDateString(dateLocale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long'
				});

				md += `\n### ${dayLabel}\n\n`;

				for (const entry of day.entries) {
					md += eventBlock(entry, t, dateLocale) + '\n';
				}

				const dr = dayReflections.get(day.key);
				if (dr) {
					const block = dayReflectionBlock(dr, day.entries, t);
					if (block) md += block + '\n';
				}
			}
		}
	}

	return md;
}

export function buildAgentPrompt(archive: string, locale: Locale): string {
	const language = locale === 'uk' ? 'Ukrainian' : 'English';

	return `Respond in language: ${language}

You are analyzing a personal Attention Journal.

The journal contains events, emotional ratings, reflections, and rating changes after reflection.

Your goal is to identify patterns, not to provide therapy.

Focus on:

- recurring themes;
- sources of positive and negative emotional impact;
- events with unusually strong influence;
- changes in perception after reflection;
- differences between events and interpretations of events;
- repeated behaviors, triggers, and motivations.

Do not:

- provide therapy;
- diagnose the user;
- moralize;
- motivate;
- praise or criticize the user;
- invent causes that are not supported by the data.

Work only with information explicitly present in the journal.

Output format (Markdown):

# Overall Tone

2–5 sentences describing the general character of the period.

# Main Sources of Positive Energy

Short list with examples.

# Main Sources of Negative Energy

Short list with examples.

# Observations

3–10 concrete observations directly supported by the journal.

# Events With The Largest Rating Changes

List events where reflection significantly changed the emotional rating.

Pay special attention to:

- negative events that became neutral or positive;
- positive events that became significantly stronger;
- cases where interpretation had a larger impact than the event itself.

# Possible Patterns

Hypotheses supported by the available data.

Clearly separate facts from interpretations.

# Reflection Questions

Suggest 3–5 open-ended questions that could help explore the discovered patterns further.

Do not answer the questions.

# Summary

5–10 concise bullet points.

Journal:

\`\`\`md
${archive}
\`\`\``;
}

export function archiveFilename(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `attention-journal-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.md`;
}

function startOfToday(dayEndHour: DayEndHour = 0): Date {
	const now = new Date();
	if (dayEndHour > 0) {
		now.setHours(now.getHours() - dayEndHour);
	}
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	start.setHours(start.getHours() + dayEndHour);
	return start;
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function exportBounds(
	range: ExportRange,
	firstDayOfWeek: 0 | 1,
	dayEndHour: DayEndHour = 0,
	custom?: CustomRange
): { start: Date; end: Date } {
	const today = startOfToday(dayEndHour);

	if (range === 'custom') {
		const a = parseDayKey(custom?.start);
		const b = parseDayKey(custom?.end);
		if (!a || !b) return { start: today, end: today }; // nothing selected yet
		let lo = new Date(a.y, a.m, a.d, dayEndHour);
		let hi = new Date(b.y, b.m, b.d, dayEndHour);
		if (lo > hi) [lo, hi] = [hi, lo];
		return { start: lo, end: addDays(hi, 1) }; // end date inclusive
	}

	if (range === 'today') {
		return { start: today, end: addDays(today, 1) };
	}

	if (range === 'month') {
		const logicalToday = new Date(today);
		logicalToday.setHours(logicalToday.getHours() - dayEndHour);
		return {
			start: new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 1, dayEndHour),
			end: new Date(logicalToday.getFullYear(), logicalToday.getMonth() + 1, 1, dayEndHour)
		};
	}

	const offset = (today.getDay() - firstDayOfWeek + 7) % 7;
	const start = addDays(today, -offset);
	return { start, end: addDays(start, 7) };
}

export function filterEntriesByRange(
	entries: EventEntry[],
	range: ExportRange,
	firstDayOfWeek: 0 | 1,
	dayEndHour: DayEndHour = 0,
	custom?: CustomRange
): EventEntry[] {
	const { start, end } = exportBounds(range, firstDayOfWeek, dayEndHour, custom);
	if (start >= end) return [];
	return entries.filter((entry) => {
		const created = new Date(entry.createdAt);
		return created >= start && created < end;
	});
}
