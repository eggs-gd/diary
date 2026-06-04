/** Panel deck/overlay slide duration; keep CSS `--panel-slide-duration` in sync. */
export const PANEL_SLIDE_MS = 560;

export const HORIZONTAL_DOMINANCE = 1.5;
export const FORWARD_HORIZONTAL_DOMINANCE = 1.15;
export const SWIPE_COMMIT_PX = 56;
export const LEFT_EDGE_BACK_PX = 24;

export type GestureMode = 'none' | 'back' | 'forward';

export interface GestureState {
	pointerId: number;
	startX: number;
	startY: number;
	mode: GestureMode;
	locked: boolean;
	captured: boolean;
}

export function createGestureState(pointerId: number, x: number, y: number): GestureState {
	return { pointerId, startX: x, startY: y, mode: 'none', locked: false, captured: false };
}

/** True once horizontal axis is chosen — vertical scroll in the panel should stop. */
export function shouldLockPanelScroll(state: GestureState | null): boolean {
	if (!state) return false;
	return state.locked || state.captured || state.mode !== 'none';
}

/** Elements that should receive taps/clicks without deck gesture handling. */
export const PANEL_INTERACTIVE_SELECTOR =
	'input, textarea, select, button, a, label, summary, [role="button"], [role="link"], [contenteditable="true"], [data-no-panel-gesture]';

export function resolveGestureMode(
	state: GestureState,
	x: number,
	y: number,
	opts: {
		canBack: boolean;
		canForward: boolean;
		fromLeftEdge: boolean;
		/** Easier horizontal lock when swiping journal → calendar. */
		preferForward?: boolean;
	}
): GestureMode {
	const dx = x - state.startX;
	const dy = y - state.startY;
	const dominance = opts.preferForward ? FORWARD_HORIZONTAL_DOMINANCE : HORIZONTAL_DOMINANCE;

	if (!state.locked) {
		if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return 'none';
		if (Math.abs(dx) <= Math.abs(dy) * dominance) return 'none';
		state.locked = true;
	}

	if (dx > 0 && opts.canBack && (opts.fromLeftEdge || dx > SWIPE_COMMIT_PX * 0.35)) {
		state.mode = 'back';
		return 'back';
	}

	if (dx < 0 && opts.canForward && Math.abs(dx) > SWIPE_COMMIT_PX * 0.35) {
		state.mode = 'forward';
		return 'forward';
	}

	if (state.mode !== 'none') return state.mode;
	return 'none';
}

export function dragOffsetForMode(mode: GestureMode, dx: number, maxWidth: number): number {
	if (mode === 'back') return Math.min(Math.max(dx, 0), maxWidth);
	if (mode === 'forward') return Math.max(Math.min(dx, 0), -maxWidth);
	return 0;
}

export function shouldCommitGesture(mode: GestureMode, dx: number, maxWidth: number): boolean {
	if (mode === 'back') return dx > Math.min(SWIPE_COMMIT_PX, maxWidth * 0.22);
	if (mode === 'forward') return Math.abs(dx) > Math.min(SWIPE_COMMIT_PX, maxWidth * 0.22);
	return false;
}
