import type { EventEntry, Locale, ReflectionProtocol } from './types';

/**
 * A sample day for the first-run tour. It is yesterday, so every time is in the past. The day
 * feels like one bad moment (−7) and still adds up to about +3. The −7 entry has a reflection
 * ready (`exampleProtocol`), which the tour fills in when it shows the reflection mode.
 */

const HOUR = 3600 * 1000;
export const EXAMPLE_ARGUMENT_ID = 'example-argument';

type Row = { hour: number; kind: 'event' | 'act'; score: number; text: Record<Locale, string> };

const ROWS: Row[] = [
	{
		hour: 7.2,
		kind: 'event',
		score: -3,
		text: { en: 'Missed the bus by ten seconds', uk: 'Запізнився на автобус на десять секунд' }
	},
	{
		hour: 8.1,
		kind: 'event',
		score: -2,
		text: { en: 'Coffee machine broke again', uk: 'Кавомашина знову зламалась' }
	},
	{
		hour: 9.0,
		kind: 'act',
		score: 1,
		text: { en: 'Planned the day in five minutes', uk: 'Спланував день за п’ять хвилин' }
	},
	{
		hour: 10.4,
		kind: 'event',
		score: -7,
		text: { en: 'Heated argument in the planning meeting', uk: 'Гаряча суперечка на плануванні' }
	},
	{
		hour: 11.2,
		kind: 'event',
		score: 2,
		text: {
			en: 'Client sent a kind note about the draft',
			uk: 'Клієнт написав добрий відгук про чернетку'
		}
	},
	{
		hour: 12.5,
		kind: 'act',
		score: 1,
		text: { en: 'Walked to lunch the long way', uk: 'Пішов на обід довшою дорогою' }
	},
	{
		hour: 13.3,
		kind: 'act',
		score: 3,
		text: { en: 'Finished the report ahead of time', uk: 'Закінчив звіт раніше терміну' }
	},
	{
		hour: 14.1,
		kind: 'act',
		score: -2,
		text: { en: 'Skipped lunch, felt shaky', uk: 'Пропустив обід, відчув слабкість' }
	},
	{
		hour: 15.0,
		kind: 'event',
		score: 1,
		text: { en: 'Neighbour held the door and smiled', uk: 'Сусід притримав двері й усміхнувся' }
	},
	{ hour: 16.2, kind: 'act', score: 2, text: { en: 'Called my sister', uk: 'Подзвонив сестрі' } },
	{
		hour: 17.4,
		kind: 'act',
		score: 2,
		text: { en: 'Cooked something new for dinner', uk: 'Приготував на вечерю щось нове' }
	},
	{
		hour: 18.6,
		kind: 'event',
		score: 1,
		text: { en: 'Quiet ten minutes on the balcony', uk: 'Тихі десять хвилин на балконі' }
	}
];

const PROTOCOL: Record<Locale, Omit<ReflectionProtocol, 'event'>> = {
	en: {
		reason: 'I felt my work was brushed aside in front of everyone.',
		about: 'I take criticism of a plan as criticism of me.',
		view: 'They were stressed about the deadline too. The objection was about scope, not about me.',
		actions: 'Send a short follow-up with the numbers and ask what would settle it.',
		reflectionScore: 3
	},
	uk: {
		reason: 'Відчув, що мою роботу відсунули вбік при всіх.',
		about: 'Я сприймаю критику плану як критику себе.',
		view: 'Вони теж були напружені через дедлайн. Заперечення було про обсяг, а не про мене.',
		actions: 'Надішлю короткий коментар із цифрами й запитаю, що б усе вирішило.',
		reflectionScore: 3
	}
};

export function isExampleEntry(entry: EventEntry): boolean {
	return entry.id.startsWith('example-');
}

/** Yesterday's sample entries, without any reflection yet. */
export function createExampleDay(locale: Locale): EventEntry[] {
	const midnight = new Date();
	midnight.setDate(midnight.getDate() - 1);
	midnight.setHours(0, 0, 0, 0);
	return ROWS.map((row, index) => {
		const createdAt = new Date(midnight.getTime() + row.hour * HOUR).toISOString();
		return {
			id: row.score === -7 ? EXAMPLE_ARGUMENT_ID : `example-${index + 1}`,
			text: row.text[locale],
			score: row.score,
			kind: row.kind,
			createdAt
		};
	});
}

/** The sample reflection for the −7 entry; the second score (+3) changes the day's total. */
export function exampleProtocol(entry: EventEntry, locale: Locale): ReflectionProtocol {
	return { event: entry.text, ...PROTOCOL[locale] };
}
