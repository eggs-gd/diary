<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import type { MainScreen } from '$lib/navigation/panel-stack';
	import {
		createGestureState,
		dragOffsetForMode,
		LEFT_EDGE_BACK_PX,
		PANEL_SLIDE_MS,
		PANEL_INTERACTIVE_SELECTOR,
		resolveGestureMode,
		shouldCommitGesture,
		type GestureState
	} from '$lib/navigation/panel-gestures';

	interface Props {
		mainScreen: MainScreen;
		overlayOpen: boolean;
		onJournal: boolean;
		canPopMain: boolean;
		onPopMain: () => void;
		onPushCalendar: () => void;
		journal: Snippet<[{ isTop: boolean; visible: boolean }]>;
		calendar: Snippet<[{ isTop: boolean; visible: boolean }]>;
	}

	let {
		mainScreen,
		overlayOpen,
		onJournal,
		canPopMain,
		onPopMain,
		onPushCalendar,
		journal,
		calendar
	}: Props = $props();

	const MAIN_SCREENS = ['journal', 'calendar'] as const;
	const activeIndex = $derived(mainScreen === 'journal' ? 0 : 1);

	let deckRoot = $state<HTMLElement | null>(null);
	let trackEl = $state<HTMLElement | null>(null);
	let dragPx = $state(0);
	let animating = $state(false);
	let gesture = $state<GestureState | null>(null);
	let displayIndex = $state(0);
	let indexSyncPaused = $state(false);
	let stepWidth = $state(0);

	const showCalendarPeek = $derived(onJournal && !overlayOpen);

	const trackTransform = $derived(
		`translate3d(calc(-${displayIndex} * 100vw + ${dragPx}px), 0, 0)`
	);

	function slotVisible(index: number): boolean {
		if (index === activeIndex || index === displayIndex) return true;
		if (index === 1 && showCalendarPeek && (dragPx < 0 || gesture?.mode === 'forward')) return true;
		return false;
	}

	function measureStepWidth(): number {
		const slot = trackEl?.querySelector<HTMLElement>('.panel-slot');
		return slot?.getBoundingClientRect().width ?? deckRoot?.clientWidth ?? window.innerWidth;
	}

	$effect(() => {
		if (!browser || !deckRoot) return;
		const ro = new ResizeObserver(() => {
			stepWidth = measureStepWidth();
		});
		ro.observe(deckRoot);
		stepWidth = measureStepWidth();
		return () => ro.disconnect();
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

	$effect(() => {
		if (!browser || overlayOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			if (!canPopMain) return;
			event.preventDefault();
			onPopMain();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!browser || !deckRoot || overlayOpen) return;

		const opts = { capture: true, passive: false };
		deckRoot.addEventListener('pointerdown', pointerDown, opts);
		deckRoot.addEventListener('pointermove', pointerMove, opts);
		deckRoot.addEventListener('pointerup', pointerEnd, opts);
		deckRoot.addEventListener('pointercancel', pointerCancel, opts);
		return () => {
			deckRoot?.removeEventListener('pointerdown', pointerDown, opts);
			deckRoot?.removeEventListener('pointermove', pointerMove, opts);
			deckRoot?.removeEventListener('pointerup', pointerEnd, opts);
			deckRoot?.removeEventListener('pointercancel', pointerCancel, opts);
		};
	});

	function releaseCapture(): void {
		if (!gesture?.captured || !trackEl) return;
		try {
			trackEl.releasePointerCapture(gesture.pointerId);
		} catch {
			// Pointer may already be released.
		}
	}

	function shouldIgnoreDeckGesture(target: Element, clientX: number): boolean {
		if (target.closest(PANEL_INTERACTIVE_SELECTOR)) return true;
		// Journal → calendar swipe must work over the list; only block deck takeover
		// on the calendar scroll surface (except left-edge back).
		if (!canPopMain) return false;
		const scrollRoot = target.closest('.shell-body');
		if (scrollRoot && clientX > LEFT_EDGE_BACK_PX + 20) return true;
		return false;
	}

	function pointerDown(event: PointerEvent): void {
		if (animating || overlayOpen || event.button !== 0) return;
		if (!(event.target instanceof Element)) return;
		if (shouldIgnoreDeckGesture(event.target, event.clientX)) return;
		gesture = createGestureState(event.pointerId, event.clientX, event.clientY);
	}

	function pointerMove(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const width = stepWidth || measureStepWidth();
		if (!width) return;

		const fromLeftEdge = gesture.startX <= LEFT_EDGE_BACK_PX + 20;
		const mode = resolveGestureMode(gesture, event.clientX, event.clientY, {
			canBack: canPopMain,
			canForward: onJournal,
			fromLeftEdge,
			preferForward: onJournal
		});

		if (mode === 'none') {
			dragPx = 0;
			return;
		}

		event.preventDefault();

		if (!gesture.captured && trackEl) {
			trackEl.setPointerCapture(event.pointerId);
			gesture.captured = true;
		}

		const dx = event.clientX - gesture.startX;
		dragPx = dragOffsetForMode(mode, dx, width);
	}

	function completeForwardSwipe(width: number): void {
		indexSyncPaused = true;
		onPushCalendar();
		animateDragTo(-width, () => {
			displayIndex = activeIndex;
			dragPx = 0;
			indexSyncPaused = false;
		});
	}

	function completeBackSwipe(width: number): void {
		indexSyncPaused = true;
		onPopMain();
		animateDragTo(width, () => {
			displayIndex = activeIndex;
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
		gesture = null;

		if (commit && mode === 'forward') {
			completeForwardSwipe(width);
			return;
		}

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
		gesture = null;
		if (hadCapture && dragPx !== 0) cancelSwipe();
		else dragPx = 0;
	}
</script>

<div class="panel-deck" bind:this={deckRoot} style:--panel-slide-duration="{PANEL_SLIDE_MS}ms">
	<div
		class="panel-track"
		role="presentation"
		class:panel-track--animating={animating && gesture === null}
		bind:this={trackEl}
		style:transform={trackTransform}
	>
		{#each MAIN_SCREENS as screen, index (screen)}
			<div
				class="panel-slot"
				aria-hidden={!slotVisible(index)}
				class:panel-slot--active={slotVisible(index)}
			>
				{#if screen === 'journal'}
					{@render journal({
						isTop: mainScreen === 'journal' && !overlayOpen,
						visible: slotVisible(0)
					})}
				{:else}
					{@render calendar({
						isTop: mainScreen === 'calendar' && !overlayOpen,
						visible: slotVisible(1)
					})}
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.panel-deck {
		position: fixed;
		inset: 0;
		z-index: var(--z-panel-deck, 120);
		width: 100%;
		height: 100dvh;
		overflow: hidden;
		background: var(--bg);
	}

	.panel-track {
		display: flex;
		height: 100%;
		will-change: transform;
		/* Horizontal deck drag; vertical scroll lives in panel slots. */
		touch-action: pan-y pinch-zoom;
	}

	.panel-track--animating {
		transition: transform var(--panel-slide-duration) cubic-bezier(0.32, 0.72, 0, 1);
	}

	.panel-slot {
		flex: none;
		width: 100vw;
		height: 100%;
		min-height: 0;
		pointer-events: none;
	}

	.panel-slot--active {
		pointer-events: auto;
		touch-action: pan-y;
	}
</style>
