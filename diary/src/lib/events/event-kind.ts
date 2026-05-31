import type { IconName } from '$lib/icons';

export const EVENT_KINDS = ['event', 'act'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const DEFAULT_EVENT_KIND: EventKind = 'event';

export const EVENT_KIND_ICON: Record<EventKind, IconName> = {
	event: 'kindEvent',
	act: 'kindAct'
};

export function normalizeEventKind(value: unknown): EventKind {
	return value === 'act' ? 'act' : 'event';
}
