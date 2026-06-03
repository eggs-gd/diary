import { hapticLight } from '$lib/platform/native';
import { track } from '$lib/analytics';
import { requestOverlayDismiss } from './overlay-dismiss';
import type { MainScreen, OverlayPanel } from './panel-stack';
import { panelKey } from './panel-stack';

function trackOverlayTransition(
	action: 'push' | 'pop' | 'replace',
	panel: OverlayPanel,
	prev?: OverlayPanel
): void {
	track('panel_navigation', {
		action,
		panel: panel.type,
		prev: prev?.type ?? 'none',
		layer: 'overlay'
	});
}

function trackMainTransition(screen: MainScreen): void {
	track('panel_navigation', {
		action: 'main',
		panel: screen,
		layer: 'main'
	});
}

export function createPanelStack() {
	let mainScreen = $state<MainScreen>('journal');
	let overlays = $state<OverlayPanel[]>([]);
	let calendarResetView = $state(false);

	const hasOverlay = $derived(overlays.length > 0);
	const top = $derived(overlays[overlays.length - 1] ?? null);
	const overlayDepth = $derived(overlays.length);
	const onJournal = $derived(mainScreen === 'journal' && !hasOverlay);
	const onMainCalendar = $derived(mainScreen === 'calendar' && !hasOverlay);
	const canPopOverlay = $derived(overlays.length > 0);
	const canPopMain = $derived(mainScreen === 'calendar' && !hasOverlay);
	/** Total depth for analytics (main + overlays). */
	const depth = $derived(1 + overlays.length);

	function openJournal(): void {
		if (mainScreen === 'journal') return;
		mainScreen = 'journal';
		trackMainTransition('journal');
		void hapticLight();
	}

	function openCalendar(resetView = true): void {
		calendarResetView = resetView;
		if (mainScreen === 'calendar' && !resetView) return;
		mainScreen = 'calendar';
		trackMainTransition('calendar');
		void hapticLight();
	}

	function takeCalendarResetView(): boolean {
		const value = calendarResetView;
		calendarResetView = false;
		return value;
	}

	function pushOverlay(panel: OverlayPanel): void {
		const key = panelKey(panel);
		const last = overlays[overlays.length - 1];
		if (last && panelKey(last) === key) return;

		overlays = [...overlays, panel];
		trackOverlayTransition('push', panel);
		void hapticLight();
	}

	function popOverlay(): boolean {
		if (overlays.length === 0) return false;
		const removed = overlays[overlays.length - 1]!;
		overlays = overlays.slice(0, -1);
		trackOverlayTransition('pop', removed);
		void hapticLight();
		return true;
	}

	function replaceTopOverlay(panel: OverlayPanel): void {
		if (overlays.length === 0) {
			overlays = [panel];
			trackOverlayTransition('push', panel);
			void hapticLight();
			return;
		}
		const prev = overlays[overlays.length - 1]!;
		overlays = [...overlays.slice(0, -1), panel];
		trackOverlayTransition('replace', panel, prev);
		void hapticLight();
	}

	/** Android back / Escape: overlay first, then calendar → journal. */
	function popOrNavigateBack(): boolean {
		if (requestOverlayDismiss()) return true;
		if (popOverlay()) return true;
		if (mainScreen === 'calendar') {
			openJournal();
			return true;
		}
		return false;
	}

	function reset(): void {
		mainScreen = 'journal';
		overlays = [];
		calendarResetView = false;
	}

	return {
		get mainScreen() {
			return mainScreen;
		},
		get overlays() {
			return overlays;
		},
		get calendarResetView() {
			return calendarResetView;
		},
		get hasOverlay() {
			return hasOverlay;
		},
		get top() {
			return top;
		},
		get onJournal() {
			return onJournal;
		},
		get onMainCalendar() {
			return onMainCalendar;
		},
		get canPopOverlay() {
			return canPopOverlay;
		},
		get canPopMain() {
			return canPopMain;
		},
		get depth() {
			return depth;
		},
		get overlayDepth() {
			return overlayDepth;
		},
		takeCalendarResetView,
		openJournal,
		openCalendar,
		pushOverlay,
		popOverlay,
		replaceTopOverlay,
		popOrNavigateBack,
		reset
	};
}

export type PanelStack = ReturnType<typeof createPanelStack>;
