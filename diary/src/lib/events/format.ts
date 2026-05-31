import type { ReflectionStatus } from './reflection-status';

export function scoreLabel(value: number): string {
	return value > 0 ? '+' + value : String(value);
}

export function tone(scoreValue: number): 'negative' | 'positive' {
	return scoreValue <= 0 ? 'negative' : 'positive';
}

export function getRangeFill(value: number): string {
	const min = -5;
	const max = 5;
	const pct = ((value - min) / (max - min)) * 100;
	return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--fill-strong) ${pct}%, var(--fill-strong) 100%)`;
}

type ProtocolField = 'reason' | 'about' | 'view' | 'actions';

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function protocolFieldLabel(
	field: ProtocolField,
	score: number,
	t: (key: string) => string
): string {
	const prefix = score <= 0 ? 'negative' : 'positive';
	return t(`analysis.${prefix}${capitalize(field)}`);
}

export function reflectActionLabel(
	status: ReflectionStatus,
	t: (key: string) => string
): string {
	const map: Record<ReflectionStatus, string> = {
		empty: t('archive.reflectEmpty'),
		partial: t('archive.reflectPartial'),
		complete: t('archive.reflectComplete')
	};
	return map[status];
}
