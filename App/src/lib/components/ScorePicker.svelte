<script lang="ts">
	import {
		buildPickerDots,
		clampScore,
		pickerAriaLabel,
		scoreFromPickerRatio
	} from '$lib/events/score-picker';

	interface Props {
		value?: number;
		ariaLabel: string;
		readonly?: boolean;
		onUserChange?: () => void;
	}

	let { value = $bindable(0), ariaLabel, readonly = false, onUserChange }: Props = $props();

	let track = $state<HTMLElement | null>(null);
	let dragging = $state(false);

	const dots = $derived(buildPickerDots(value));
	const valueLabel = $derived(pickerAriaLabel(value));

	function setScoreFromClientX(clientX: number): void {
		if (readonly) return;
		if (!track) return;
		const rect = track.getBoundingClientRect();
		if (rect.width <= 0) return;
		const ratio = (clientX - rect.left) / rect.width;
		value = scoreFromPickerRatio(ratio);
		onUserChange?.();
	}

	function onPointerDown(event: PointerEvent): void {
		if (readonly) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		dragging = true;
		track?.setPointerCapture(event.pointerId);
		setScoreFromClientX(event.clientX);
	}

	function onPointerMove(event: PointerEvent): void {
		if (readonly) return;
		if (!dragging) return;
		setScoreFromClientX(event.clientX);
	}

	function onPointerUp(event: PointerEvent): void {
		if (!dragging) return;
		dragging = false;
		if (track?.hasPointerCapture(event.pointerId)) {
			track.releasePointerCapture(event.pointerId);
		}
	}

	function selectDot(dotValue: number): void {
		if (readonly) return;
		value = clampScore(dotValue);
		onUserChange?.();
	}
</script>

<div class="score-picker-wrap">
	<div
		bind:this={track}
		class="score-picker"
		class:score-picker--readonly={readonly}
		role="slider"
		aria-label={ariaLabel}
		aria-readonly={readonly}
		aria-valuemin={-10}
		aria-valuemax={10}
		aria-valuenow={value}
		aria-valuetext={valueLabel}
		tabindex="0"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		onkeydown={(event) => {
			if (readonly) return;
			if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
				event.preventDefault();
				value = clampScore(value - 1);
				onUserChange?.();
			}
			if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
				event.preventDefault();
				value = clampScore(value + 1);
				onUserChange?.();
			}
		}}
	>
		{#each dots as dot (dot.value)}
			<button
				type="button"
				class="score-picker-dot"
				class:score-picker-dot--zero={dot.kind === 'zero'}
				class:score-picker-dot--negative-muted={dot.kind === 'negative' && dot.tone === 'muted'}
				class:score-picker-dot--negative-bright={dot.kind === 'negative' && dot.tone === 'bright'}
				class:score-picker-dot--positive-muted={dot.kind === 'positive' && dot.tone === 'muted'}
				class:score-picker-dot--positive-bright={dot.kind === 'positive' && dot.tone === 'bright'}
				class:score-picker-dot--zero-muted={dot.kind === 'zero' && dot.tone === 'muted'}
				class:score-picker-dot--zero-bright={dot.kind === 'zero' && dot.tone === 'bright'}
				aria-hidden="true"
				tabindex="-1"
				disabled={readonly}
				onclick={(event) => {
					event.stopPropagation();
					selectDot(dot.value);
				}}
			></button>
		{/each}
	</div>
</div>

<style>
	.score-picker-wrap {
		display: grid;
		gap: var(--space-2);
		width: 100%;
		max-width: min(100%, var(--content-max-width));
		margin-inline: auto;
		min-width: 0;
		container-type: inline-size;
	}

	.score-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: clamp(0.0625rem, 0.35cqi, 0.2rem);
		width: 100%;
		max-width: 100%;
		min-height: var(--size-touch);
		padding: var(--space-2) 0;
		touch-action: none;
		user-select: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.score-picker--readonly {
		cursor: default;
		touch-action: pan-y;
	}

	.score-picker:focus-visible {
		outline: none;
	}

	.score-picker-dot {
		flex: 0 1 min(0.65625rem, 3.15cqi);
		width: min(0.65625rem, 3.15cqi);
		height: min(0.65625rem, 3.15cqi);
		min-width: 0.3125rem;
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		pointer-events: auto;
		transition:
			background var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.score-picker-dot:disabled {
		cursor: default;
	}

	.score-picker-dot--zero {
		flex-basis: min(0.84375rem, 4.05cqi);
		width: min(0.84375rem, 4.05cqi);
		height: min(0.84375rem, 4.05cqi);
	}

	.score-picker-dot--negative-muted {
		background: color-mix(in srgb, var(--accent-rose) 42%, transparent);
	}

	.score-picker-dot--negative-bright {
		background: var(--accent-rose);
	}

	.score-picker-dot--positive-muted {
		background: color-mix(in srgb, var(--accent-leaf) 42%, transparent);
	}

	.score-picker-dot--positive-bright {
		background: var(--accent-leaf);
	}

	.score-picker-dot--zero-muted {
		background: color-mix(in srgb, var(--text-faint) 38%, transparent);
	}

	.score-picker-dot--zero-bright {
		background: color-mix(in srgb, var(--text-soft) 72%, transparent);
	}
</style>
