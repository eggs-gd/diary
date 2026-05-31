import { browser } from '$app/environment';

export interface VisualViewportMetrics {
	height: number;
	offsetTop: number;
	keyboardInset: number;
}

export function measureVisualViewport(): VisualViewportMetrics {
	if (!browser) {
		return { height: 0, offsetTop: 0, keyboardInset: 0 };
	}

	const vv = window.visualViewport;
	if (!vv) {
		return { height: window.innerHeight, offsetTop: 0, keyboardInset: 0 };
	}

	const keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));

	return {
		height: Math.round(vv.height),
		offsetTop: Math.round(vv.offsetTop),
		keyboardInset
	};
}

export function applyVisualViewportVars(target: HTMLElement): VisualViewportMetrics {
	const metrics = measureVisualViewport();
	target.style.setProperty('--visual-viewport-height', `${metrics.height}px`);
	target.style.setProperty('--visual-viewport-offset-top', `${metrics.offsetTop}px`);
	target.style.setProperty('--keyboard-inset', `${metrics.keyboardInset}px`);
	return metrics;
}

export function clearVisualViewportVars(target: HTMLElement): void {
	target.style.removeProperty('--visual-viewport-height');
	target.style.removeProperty('--visual-viewport-offset-top');
	target.style.removeProperty('--keyboard-inset');
}

export function subscribeVisualViewport(
	target: HTMLElement,
	onUpdate?: (metrics: VisualViewportMetrics) => void
): () => void {
	if (!browser) return () => {};

	const update = (): void => {
		const metrics = applyVisualViewportVars(target);
		onUpdate?.(metrics);
	};

	update();

	const vv = window.visualViewport;
	vv?.addEventListener('resize', update);
	vv?.addEventListener('scroll', update);
	window.addEventListener('resize', update);

	return () => {
		vv?.removeEventListener('resize', update);
		vv?.removeEventListener('scroll', update);
		window.removeEventListener('resize', update);
		clearVisualViewportVars(target);
	};
}
