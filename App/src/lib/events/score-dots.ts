export type DotPolarity = 'positive' | 'negative';
export type DotTone = 'muted' | 'bright' | 'gray' | 'gap';

export interface ScoreDot {
	tone: DotTone;
	polarity: DotPolarity;
}

function polarityOf(value: number): DotPolarity {
	return value > 0 ? 'positive' : 'negative';
}

function mutedDots(count: number, polarity: DotPolarity): ScoreDot[] {
	return Array.from({ length: count }, () => ({ tone: 'muted', polarity }));
}

function zeroDot(): ScoreDot[] {
	return [{ tone: 'gray', polarity: 'negative' }];
}

function polarityFlipDots(original: number, current: number): ScoreDot[] {
	const origMag = Math.abs(original);
	const currentMag = Math.abs(current);
	const result: ScoreDot[] = [];

	if (origMag > 0) {
		result.push(
			...Array.from({ length: origMag }, () => ({
				tone: 'gray' as const,
				polarity: polarityOf(original)
			}))
		);
		result.push({ tone: 'gap', polarity: polarityOf(current) });
	}

	result.push(
		...Array.from({ length: currentMag }, () => ({
			tone: 'bright' as const,
			polarity: polarityOf(current)
		}))
	);

	return result;
}

export function buildScoreDots(original: number, reflected?: number): ScoreDot[] {
	const hasReflection = reflected !== undefined;
	const current = hasReflection ? reflected : original;
	const origMag = Math.abs(original);
	const currentMag = Math.abs(current);

	if (currentMag === 0 && (!hasReflection || origMag === 0)) return zeroDot();

	if (!hasReflection || original === reflected) {
		return mutedDots(currentMag, polarityOf(current));
	}

	const origSign = Math.sign(original);
	const currentSign = Math.sign(current);

	if (origSign !== currentSign && currentMag > 0) {
		return polarityFlipDots(original, current);
	}

	const polarity = polarityOf(current || original);
	const total = Math.max(origMag, currentMag);

	if (currentMag < origMag) {
		return Array.from({ length: total }, (_, index) => ({
			tone: index < currentMag ? 'muted' : 'gray',
			polarity
		}));
	}

	if (currentMag > origMag) {
		return Array.from({ length: total }, (_, index) => ({
			tone: index < origMag ? 'muted' : 'bright',
			polarity
		}));
	}

	return mutedDots(total, polarity);
}

export function scoreDotsLabel(original: number, reflected?: number): string {
	const dots = buildScoreDots(original, reflected);
	const current = reflected ?? original;
	if (reflected !== undefined && original !== reflected) {
		return `${original} → ${current}`;
	}
	return String(current);
}
