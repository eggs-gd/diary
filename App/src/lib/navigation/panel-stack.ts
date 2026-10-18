import type { EventKind } from '$lib/events/types';
import type { EventEntry } from '$lib/events/types';
import { getReflectionStatus } from '$lib/events/reflection-status';

export type MainScreen = 'journal' | 'calendar';

export interface CapturePreset {
	initialText?: string;
	initialKind?: EventKind | null;
	initialScore?: number;
	initialCreatedAt?: string;
	focusKey?: number;
}

export type Panel =
	| { type: 'journal' }
	| { type: 'calendar'; resetView?: boolean }
	| { type: 'dayReflection'; dayKey: string }
	| { type: 'eventWizard'; entryId: string }
	| { type: 'eventReport'; entryId: string }
	| { type: 'capture'; preset: CapturePreset; source: string };

/** Child panels stacked over journal / calendar. */
export type OverlayPanel = Exclude<Panel, { type: 'journal' } | { type: 'calendar' }>;

export type PanelSource = 'journal' | 'calendar' | 'dayReflection';

export function panelKey(panel: Panel | OverlayPanel): string {
	switch (panel.type) {
		case 'journal':
			return 'journal';
		case 'calendar':
			return 'calendar';
		case 'dayReflection':
			return `day:${panel.dayKey}`;
		case 'eventWizard':
			return `wizard:${panel.entryId}`;
		case 'eventReport':
			return `report:${panel.entryId}`;
		case 'capture':
			return `capture:${panel.source}:${panel.preset.focusKey ?? 0}:${panel.preset.initialText ?? ''}`;
	}
}

export function panelSourceFromContext(
	mainScreen: MainScreen,
	overlays: OverlayPanel[]
): PanelSource {
	const top = overlays[overlays.length - 1];
	if (top?.type === 'dayReflection') return 'dayReflection';
	if (mainScreen === 'calendar') return 'calendar';
	return 'journal';
}

/** @deprecated Use panelSourceFromContext */
export function panelSourceFromStack(panels: Panel[]): PanelSource {
	let main: MainScreen = 'journal';
	const overlays: OverlayPanel[] = [];
	for (const panel of panels) {
		if (panel.type === 'journal') main = 'journal';
		else if (panel.type === 'calendar') main = 'calendar';
		else overlays.push(panel);
	}
	return panelSourceFromContext(main, overlays);
}

export function eventPanelForEntry(
	entry: EventEntry,
	enableReflection: boolean
): Extract<OverlayPanel, { type: 'eventWizard' } | { type: 'eventReport' }> {
	/** Events mode: always analysis report, never step-by-step quiz. */
	if (!enableReflection) {
		return { type: 'eventReport', entryId: entry.id };
	}
	/** Reflection mode: quiz for new entries, report for started or complete. */
	if (getReflectionStatus(entry) === 'empty') {
		return { type: 'eventWizard', entryId: entry.id };
	}
	return { type: 'eventReport', entryId: entry.id };
}
