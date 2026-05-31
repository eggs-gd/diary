export type PickerDotKind = 'negative' | 'zero' | 'positive';
export type PickerDotTone = 'muted' | 'bright';

export interface PickerDot {
	value: number;
	kind: PickerDotKind;
	tone: PickerDotTone;
}

export const SCORE_MIN = -10;
export const SCORE_MAX = 10;
export const PICKER_VALUES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, index) => SCORE_MIN + index);

export function clampScore(value: number): number {
	return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}

export function scoreFromPickerRatio(ratio: number): number {
	return clampScore(Math.round(ratio * (SCORE_MAX - SCORE_MIN)) + SCORE_MIN);
}

export function pickerRatioFromScore(value: number): number {
	return (clampScore(value) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
}

export function buildPickerDots(value: number): PickerDot[] {
	const score = clampScore(value);

	return PICKER_VALUES.map((dotValue) => {
		if (dotValue === 0) {
			return { value: 0, kind: 'zero', tone: score === 0 ? 'bright' : 'muted' };
		}

		if (dotValue < 0) {
			return {
				value: dotValue,
				kind: 'negative',
				tone: score < 0 && dotValue >= score ? 'bright' : 'muted'
			};
		}

		return {
			value: dotValue,
			kind: 'positive',
			tone: score > 0 && dotValue <= score ? 'bright' : 'muted'
		};
	});
}

export function pickerAriaLabel(value: number): string {
	const score = clampScore(value);
	return score > 0 ? `+${score}` : String(score);
}
