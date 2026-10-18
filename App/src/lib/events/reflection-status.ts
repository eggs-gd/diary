import type { EventEntry, ReflectionProtocol } from './types';

export type ReflectionStatus = 'empty' | 'partial' | 'complete';

const protocolFields = ['reason', 'about', 'view', 'actions'] as const;

type ProtocolDraft = Pick<ReflectionProtocol, (typeof protocolFields)[number]>;

export function protocolFilledCount(draft: ProtocolDraft | undefined): number {
	if (!draft) return 0;
	return protocolFields.filter((field) => draft[field]?.trim()).length;
}

export function areAllProtocolFieldsFilled(draft: ProtocolDraft): boolean {
	return protocolFields.every((field) => draft[field]?.trim());
}

export function shouldSaveReflectionScore(
	entry: EventEntry,
	draft: ProtocolDraft,
	reflectionScore: number
): boolean {
	const baselineScore = entry.protocol?.reflectionScore ?? entry.score;
	const scoreChanged = reflectionScore !== baselineScore;
	return scoreChanged || areAllProtocolFieldsFilled(draft);
}

export function getReflectionStatus(entry: EventEntry): ReflectionStatus {
	const protocol = entry.protocol;
	if (!protocol) return 'empty';

	const filledCount = protocolFilledCount(protocol);

	if (filledCount === 0) {
		return protocol.reflectionScore !== undefined ? 'partial' : 'empty';
	}

	if (protocol.reflectionScore !== undefined && areAllProtocolFieldsFilled(protocol)) {
		return 'complete';
	}

	return 'partial';
}

export type ReflectStatusIcon = 'reflectEmpty' | 'reflectPartial' | 'reflectComplete';

export function reflectStatusIcon(status: ReflectionStatus): ReflectStatusIcon {
	if (status === 'complete') return 'reflectComplete';
	if (status === 'partial') return 'reflectPartial';
	return 'reflectEmpty';
}
