import type { EventEntry, Locale } from './types';

const TEXTS: Record<
	Locale,
	{ event: string; reason: string; about: string; view: string; actions: string }
> = {
	en: {
		event: 'Example: my colleague answered my long message with just “ok”.',
		reason: 'It felt dismissive, as if what I wrote did not matter.',
		about: 'I read silence as a verdict on me, and I tend to expect to be brushed off.',
		view: 'They might have been busy, or “ok” is simply how they write. I do not actually know.',
		actions: 'Next time I will ask a direct question instead of guessing.'
	},
	uk: {
		event: 'Приклад: колега відповів на моє довге повідомлення одним «ок».',
		reason: 'Здалося, що це відмахування, ніби те, що я написав, нічого не варте.',
		about: 'Я сприймаю мовчання як вирок про себе і зазвичай чекаю, що мене проігнорують.',
		view: 'Можливо, він був зайнятий, або так просто пише. Насправді я цього не знаю.',
		actions: 'Наступного разу поставлю пряме запитання, замість того щоб гадати.'
	}
};

/** A filled-in sample entry for the first-run screen; it is a normal entry and can be deleted. */
export function createExampleEntry(locale: Locale): EventEntry {
	const t = TEXTS[locale];
	const now = new Date().toISOString();
	return {
		id: `example-${Date.now()}`,
		text: t.event,
		score: -4,
		kind: 'event',
		createdAt: now,
		protocol: {
			event: t.event,
			reason: t.reason,
			about: t.about,
			view: t.view,
			actions: t.actions,
			reflectionScore: -1
		}
	};
}
