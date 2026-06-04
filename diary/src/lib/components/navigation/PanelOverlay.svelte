<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import type { OverlayPanel } from '$lib/navigation/panel-stack';
	import { panelKey } from '$lib/navigation/panel-stack';
	import {
		createGestureState,
		dragOffsetForMode,
		LEFT_EDGE_BACK_PX,
		PANEL_SLIDE_MS,
		resolveGestureMode,
		shouldLockPanelScroll,
		shouldCommitGesture,
		type GestureState
	} from '$lib/navigation/panel-gestures';
	import { registerOverlayDismiss } from '$lib/navigation/overlay-dismiss';
	import { lockDocumentScroll } from '$lib/platform/scroll-lock';

	interface Props {
		overlays: OverlayPanel[];
		onPop: () => void;
		panel: Snippet<[{ panel: OverlayPanel; index: number; isTop: boolean; visible: boolean }]>;
	}

	let { overlays, onPop, panel }: Props = $props();

	const activeIndex = $derived(Math.max(0, overlays.length - 1));

	let overlayRoot = $state<HTMLElement | null>(null);
	let trackEl = $state<HTMLElement | null>(null);
	let dragPx = $state(0);
	let animating = $state(false);
	let gesture = $state<GestureState | null>(null);
	let scrollLocked = $state(false);
	let displayIndex = $state(0);
	let indexSyncPaused = $state(false);
	let topSlidePx = $state(0);
	let topSlideAnimating = $state(false);
	let stepWidth = $state(0);

	const trackTransform = $derived(
		`translate3d(calc(-${displayIndex} * 100vw + ${dragPx}px), 0, 0)`
	);
	const topPanelKey = $derived(
		overlays.length > 0 ? panelKey(overlays[Math.min(activeIndex, overlays.length - 1)]!) : ''
	);

	function slotVisible(index: number): boolean {
		return index === activeIndex || index === displayIndex;
	}

	function measureStepWidth(): number {
		const slot = trackEl?.querySelector<HTMLElement>('.panel-slot');
		return slot?.getBoundingClientRect().width ?? overlayRoot?.clientWidth ?? window.innerWidth;
	}

	$effect(() => {
		if (!browser || !overlayRoot || overlays.length === 0) return;
		const ro = new ResizeObserver(() => {
			stepWidth = measureStepWidth();
		});
		ro.observe(overlayRoot);
		stepWidth = measureStepWidth();
		return () => ro.disconnect();
	});

	$effect(() => {
		overlays.length;
		queueMicrotask(() => {
			stepWidth = measureStepWidth();
		});
	});

	function activeScrollRoot(): HTMLElement | null {
		if (!trackEl) return null;
		const slot = trackEl.querySelectorAll<HTMLElement>('.panel-slot')[activeIndex];
		if (!slot) return trackEl;
		return slot.querySelector<HTMLElement>('.shell-body') ?? slot;
	}

	$effect(() => {
		if (!browser || overlays.length === 0) return;
		let release: (() => void) | undefined;
		let cancelled = false;
		queueMicrotask(() => {
			if (cancelled) return;
			release = lockDocumentScroll(activeScrollRoot);
		});
		return () => {
			cancelled = true;
			release?.();
		};
	});

	function scheduleSlideEnd(): void {
		window.setTimeout(() => {
			if (dragPx === 0) animating = false;
		}, PANEL_SLIDE_MS);
	}

	function animateDragTo(targetPx: number, onComplete: () => void): void {
		animating = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				dragPx = targetPx;
			});
		});
		window.setTimeout(() => {
			onComplete();
			scheduleSlideEnd();
		}, PANEL_SLIDE_MS);
	}

	$effect(() => {
		const target = activeIndex;
		if (overlays.length === 0) {
			displayIndex = 0;
			return;
		}
		if (indexSyncPaused || displayIndex === target) return;

		animating = true;
		let innerFrame = 0;
		const outerFrame = requestAnimationFrame(() => {
			innerFrame = requestAnimationFrame(() => {
				displayIndex = target;
				scheduleSlideEnd();
			});
		});
		return () => {
			cancelAnimationFrame(outerFrame);
			if (innerFrame) cancelAnimationFrame(innerFrame);
		};
	});

	let lastTopKey = '';
	let lastPanelCount = 0;
	$effect(() => {
		const key = topPanelKey;
		const w = stepWidth;
		const count = overlays.length;

		if (!key) return;

		if (!lastTopKey) {
			lastTopKey = key;
			lastPanelCount = count;
			return;
		}

		const isReplace = count === lastPanelCount;

		if (key !== lastTopKey && w > 0 && isReplace && displayIndex === activeIndex) {
			topSlidePx = w;
			topSlideAnimating = true;
			animating = true;
			let innerFrame = 0;
			const outerFrame = requestAnimationFrame(() => {
				innerFrame = requestAnimationFrame(() => {
					topSlidePx = 0;
					scheduleSlideEnd();
					window.setTimeout(() => {
						topSlideAnimating = false;
					}, PANEL_SLIDE_MS);
				});
			});
			lastTopKey = key;
			lastPanelCount = count;
			return () => {
				cancelAnimationFrame(outerFrame);
				if (innerFrame) cancelAnimationFrame(innerFrame);
			};
		}

		lastTopKey = key;
		lastPanelCount = count;
	});

	$effect(() => {
		if (!browser || overlays.length === 0) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			dismissOverlay();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!browser || overlays.length === 0) return;
		return registerOverlayDismiss(dismissOverlay);
	});

	$effect(() => {
		if (!browser || !overlayRoot || overlays.length === 0) return;

		const opts = { capture: true, passive: false };
		overlayRoot.addEventListener('pointerdown', pointerDown, opts);
		overlayRoot.addEventListener('pointermove', pointerMove, opts);
		overlayRoot.addEventListener('pointerup', pointerEnd, opts);
		overlayRoot.addEventListener('pointercancel', pointerCancel, opts);
		return () => {
			overlayRoot?.removeEventListener('pointerdown', pointerDown, opts);
			overlayRoot?.removeEventListener('pointermove', pointerMove, opts);
			overlayRoot?.removeEventListener('pointerup', pointerEnd, opts);
			overlayRoot?.removeEventListener('pointercancel', pointerCancel, opts);
		};
	});

	$effect(() => {
		if (!browser || !overlayRoot || !scrollLocked) return;
		const root = overlayRoot;

		const blockScroll = (event: TouchEvent) => {
			event.preventDefault();
		};
		root.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
		return () => root.removeEventListener('touchmove', blockScroll, { capture: true });
	});

	function syncScrollLock(): void {
		scrollLocked = shouldLockPanelScroll(gesture);
	}

	function clearGesture(): void {
		gesture = null;
		scrollLocked = false;
	}

	function releaseCapture(): void {
		if (!gesture?.captured || !trackEl) return;
		try {
			trackEl.releasePointerCapture(gesture.pointerId);
		} catch {
			// Pointer may already be released.
		}
	}

	function shouldIgnoreOverlayGesture(target: Element): boolean {
		if (target.closest('.panel-shell__chrome, .panel-shell__footer-chrome')) return true;
		if (target.closest('[data-no-panel-gesture]')) return true;
		return false;
	}

	function pointerDown(event: PointerEvent): void {
		if (animating || overlays.length === 0 || event.button !== 0) return;
		if (!(event.target instanceof Element)) return;
		if (shouldIgnoreOverlayGesture(event.target)) return;
		gesture = createGestureState(event.pointerId, event.clientX, event.clientY);
	}

	function pointerMove(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const width = stepWidth || measureStepWidth();
		if (!width) return;

		const fromLeftEdge = gesture.startX <= LEFT_EDGE_BACK_PX + 20;
		const mode = resolveGestureMode(gesture, event.clientX, event.clientY, {
			canBack: true,
			canForward: false,
			fromLeftEdge
		});

		if (!shouldLockPanelScroll(gesture)) {
			syncScrollLock();
			dragPx = 0;
			return;
		}

		syncScrollLock();
		event.preventDefault();

		if (mode === 'back' && !gesture.captured) {
			const active = document.activeElement;
			if (active instanceof HTMLElement && overlayRoot?.contains(active)) {
				active.blur();
			}
		}

		if (!gesture.captured && trackEl) {
			trackEl.setPointerCapture(event.pointerId);
			gesture.captured = true;
		}

		if (mode === 'none') {
			dragPx = 0;
			return;
		}

		const dx = event.clientX - gesture.startX;
		dragPx = dragOffsetForMode(mode, dx, width);
	}

	function dismissOverlay(): void {
		if (animating || overlays.length === 0) return;
		const width = stepWidth || measureStepWidth();
		if (!width) {
			onPop();
			return;
		}
		completeBackSwipe(width);
	}

	function completeBackSwipe(width: number): void {
		indexSyncPaused = true;
		animateDragTo(width, () => {
			onPop();
			displayIndex = 0;
			dragPx = 0;
			indexSyncPaused = false;
		});
	}

	function cancelSwipe(): void {
		animateDragTo(0, () => {});
	}

	function pointerEnd(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;

		const width = stepWidth || measureStepWidth();
		const dx = event.clientX - gesture.startX;
		const mode = gesture.mode;
		const commit = shouldCommitGesture(mode, dx, width);
		const hadCapture = gesture.captured;

		releaseCapture();
		clearGesture();

		if (commit && mode === 'back') {
			completeBackSwipe(width);
			return;
		}

		if (hadCapture) {
			event.preventDefault();
			cancelSwipe();
		}
	}

	function pointerCancel(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const hadCapture = gesture.captured;
		releaseCapture();
		clearGesture();
		if (hadCapture && dragPx !== 0) cancelSwipe();
		else dragPx = 0;
	}
</script>

{#if overlays.length > 0}
	<div
		class="panel-overlay"
		class:panel-overlay--gesture-lock={scrollLocked}
		bind:this={overlayRoot}
		style:--panel-slide-duration="{PANEL_SLIDE_MS}ms"
	>
		<div
			class="panel-overlay-track"
			role="presentation"
			class:panel-overlay-track--animating={animating && gesture === null}
			bind:this={trackEl}
			style:transform={trackTransform}
		>
			{#each overlays as item, index (panelKey(item))}
				<div
					class="panel-slot"
					aria-hidden={!slotVisible(index)}
					class:panel-slot--active={slotVisible(index)}
					class:panel-slot--slide-anim={index === displayIndex && topSlideAnimating}
					style:transform={index === displayIndex && topSlideAnimating
						? `translateX(${topSlidePx}px)`
						: undefined}
				>
					{@render panel({
						panel: item,
						index,
						isTop: index === activeIndex,
						visible: slotVisible(index)
					})}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.panel-overlay {
		position: fixed;
		inset: 0;
		z-index: var(--z-panel-overlay, 130);
		width: 100%;
		height: 100dvh;
		overflow: hidden;
		background: transparent;
		pointer-events: none;
	}

	.panel-overlay--gesture-lock :global(.panel-slot--active .shell-body) {
		touch-action: none;
		overscroll-behavior: none;
	}

	.panel-overlay-track {
		display: flex;
		height: 100%;
		will-change: transform;
		touch-action: pan-y pinch-zoom;
		pointer-events: auto;
	}

	.panel-overlay-track--animating {
		transition: transform var(--panel-slide-duration) cubic-bezier(0.32, 0.72, 0, 1);
	}

	.panel-slot--slide-anim {
		transition: transform var(--panel-slide-duration) cubic-bezier(0.32, 0.72, 0, 1);
	}

	.panel-slot {
		flex: none;
		width: 100vw;
		height: 100%;
		min-height: 0;
		pointer-events: none;
		background: var(--bg);
		box-shadow: -8px 0 32px rgb(0 0 0 / 0.18);
	}

	.panel-slot--active {
		pointer-events: auto;
		touch-action: pan-y;
	}
</style>
