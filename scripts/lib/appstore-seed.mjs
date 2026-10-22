/**
 * Fictional sample data for the store / landing screenshots. English only, no real people.
 * Scores follow the app's -10..10 scale. The day score the app shows is a damped sum
 * (sign * sqrt|score|, summed), so many small good moments outweigh one big swing.
 */

const HOUR = 3600 * 1000;

/** Today's entries: the felt-bad day that turns out fine. [hoursAgo-from-midnight, text, kind, score] */
const todayRows = [
	[7.2, 'Missed the bus by ten seconds', 'event', -3],
	[8.1, 'Coffee machine broke again', 'event', -2],
	[9.0, 'Planned the day in five minutes', 'act', 1],
	[10.4, 'Heated argument in the planning meeting', 'event', -7],
	[11.2, 'Client sent a kind note about the draft', 'event', 2],
	[12.5, 'Walked to lunch the long way', 'act', 1],
	[13.3, 'Finished the report ahead of time', 'act', 3],
	[14.1, 'Skipped lunch, felt shaky', 'act', -2],
	[15.0, 'Neighbour held the door and smiled', 'event', 1],
	[16.2, 'Called my sister', 'act', 2],
	[17.4, 'Cooked something new for dinner', 'act', 2],
	[18.6, 'Quiet ten minutes on the balcony', 'event', 1]
];

export const argumentText = 'Heated argument in the planning meeting';

export const argumentProtocol = {
	event: argumentText,
	reason: 'I felt my work was brushed aside in front of everyone.',
	about: 'I take criticism of a plan as criticism of me.',
	view: 'They were stressed about the deadline too. The objection was about scope, not about me.',
	actions: 'Send a short follow-up with the numbers and ask what would settle it.',
	reflectionScore: 3
};

function startOfToday(now) {
	const d = new Date(now);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/** Deterministic pseudo-random, so the calendar looks the same on every run. */
function mulberry32(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const dayBias = [1, -2, 3, -1, 2, 1, -3, 2, 1, -1, 3, 1];

const pastPositive = [
	'Slow morning, good coffee',
	'Helped a colleague with a bug',
	'Lunch with an old friend',
	'Gym, finally',
	'Fixed the thing that kept breaking',
	'Short walk after work'
];

const pastNegative = [
	'Deadline moved up',
	'Long call that went nowhere',
	'Forgot my keys',
	'Train was cancelled',
	'Missed a message that mattered'
];

/**
 * @param {number} now
 * @param {{ withProtocol?: boolean, history?: boolean }} options
 */
export function buildEntries(now, { withProtocol = false, history = false } = {}) {
	const midnight = startOfToday(now);
	const entries = todayRows.map(([hour, text, kind, score], index) => {
		const createdAt = new Date(midnight + hour * HOUR).toISOString();
		const entry = { id: `shot-today-${index + 1}`, text, score, kind, createdAt, updatedAt: createdAt };
		if (withProtocol && text === argumentText) entry.protocol = { ...argumentProtocol };
		return entry;
	});

	if (history) {
		const rand = mulberry32(42);
		for (let day = 1; day <= 24; day++) {
			const count = 3 + Math.floor(rand() * 5);
			// A fixed mix of lighter and heavier days, so the archive shows both.
			const bias = dayBias[(day - 1) % dayBias.length];
			for (let i = 0; i < count; i++) {
				const score = Math.max(-8, Math.min(8, bias + Math.floor(rand() * 5) - 2)) || 1;
				const pool = score > 0 ? pastPositive : pastNegative;
				const hour = 8 + i * 1.7;
				const createdAt = new Date(midnight - day * 24 * HOUR + hour * HOUR).toISOString();
				entries.push({
					id: `shot-past-${day}-${i}`,
					text: pool[(day + i) % pool.length],
					score,
					kind: rand() > 0.6 ? 'act' : 'event',
					createdAt,
					updatedAt: createdAt
				});
			}
		}
	}
	return entries;
}
