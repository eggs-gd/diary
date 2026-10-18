<script lang="ts">
	import { tick } from 'svelte';
	import type { Snippet } from 'svelte';
	import { resizeQuizTextarea } from '$lib/utils/resize-quiz-textarea';

	interface Props {
		value: string;
		focused?: boolean;
		placeholder?: string;
		ariaLabel?: string;
		minLines?: number;
		bufferLines?: number;
		resizeTrigger?: unknown;
		editIcon?: Snippet;
	}

	let {
		value = $bindable(),
		focused = $bindable(false),
		placeholder = '',
		ariaLabel = '',
		minLines = 2,
		bufferLines = 1,
		resizeTrigger,
		editIcon
	}: Props = $props();

	let textarea = $state<HTMLTextAreaElement | null>(null);
	let wrap = $state<HTMLDivElement | null>(null);
	let resizeFrame: number | null = null;

	const showDisplay = $derived(!focused);
	const isEmpty = $derived(!value.trim());

	function resize(): void {
		if (!textarea || !wrap) return;
		resizeQuizTextarea(textarea, wrap, { minLines, bufferLines });
	}

	function queueResize(): void {
		if (resizeFrame !== null) return;
		resizeFrame = requestAnimationFrame(() => {
			resizeFrame = null;
			resize();
		});
	}

	function scrollFieldIntoView(behavior: ScrollBehavior = 'smooth'): void {
		const target =
			wrap?.closest<HTMLElement>('.day-section, .report-section, .capture-step') ?? wrap;
		target?.scrollIntoView({ block: 'center', behavior });
	}

	$effect(() => {
		if (!focused) return;
		requestAnimationFrame(() => {
			textarea?.focus({ preventScroll: true });
			queueResize();
			requestAnimationFrame(() => scrollFieldIntoView());
			window.setTimeout(() => scrollFieldIntoView(), 180);
		});
	});

	$effect(() => {
		// Track reactive dependencies for resize
		value;
		focused;
		resizeTrigger;
		void tick().then(() => {
			queueResize();
			if (focused) {
				requestAnimationFrame(() => scrollFieldIntoView('auto'));
			}
		});
	});

	$effect(() => {
		return () => {
			if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
		};
	});
</script>

<div class="quiz-input-wrap" bind:this={wrap}>
	{#if showDisplay}
		<button
			type="button"
			class="quiz-input-display"
			class:quiz-input-display--placeholder={isEmpty}
			aria-label={ariaLabel}
			onclick={() => (focused = true)}
		>
			{#if isEmpty}{placeholder}{#if editIcon}{@render editIcon()}{/if}
			{:else}{value}{#if editIcon}{@render editIcon()}{/if}{/if}
		</button>
	{:else if isEmpty}
		<div class="quiz-input-placeholder" aria-hidden="true">
			{placeholder}{#if editIcon}{@render editIcon()}{/if}
		</div>
	{/if}
	<textarea
		bind:this={textarea}
		class="quiz-input"
		class:quiz-input--hidden={showDisplay}
		bind:value
		rows={minLines}
		aria-label={ariaLabel}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		oninput={queueResize}
	></textarea>
</div>

<style>
	:global(svg.inline-edit-icon) {
		display: inline-block;
		width: 1.25rem;
		height: 1.25rem;
		margin-inline-start: 0.25em;
		vertical-align: -0.14em;
		color: var(--text);
	}

	.quiz-input-wrap {
		position: relative;
		width: 100%;
	}

	.quiz-input-display {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		text-align: left;
		font-family: var(--font-sans);
		font-size: 1rem;
		font-weight: 300;
		line-height: var(--leading-normal);
		color: var(--text-soft);
		cursor: text;
		overflow: hidden;
		white-space: pre-wrap;
		word-break: break-word;
		-webkit-tap-highlight-color: transparent;
		-webkit-appearance: none;
		appearance: none;
	}

	.quiz-input-display--placeholder {
		color: var(--text-faint);
	}

	.quiz-input-placeholder {
		position: absolute;
		inset: 0;
		pointer-events: none;
		font-family: var(--font-sans);
		font-size: 1rem;
		font-weight: 300;
		line-height: var(--leading-normal);
		color: var(--text-faint);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.quiz-input-placeholder :global(svg.inline-edit-icon) {
		color: var(--text-soft);
	}

	.quiz-input {
		width: 100%;
		min-height: 0;
		margin: 0;
		padding: 0;
		overflow: hidden;
		resize: none;
		font-family: var(--font-sans);
		font-size: 1rem;
		font-weight: 300;
		line-height: var(--leading-normal);
		color: var(--text-soft);
		background: transparent;
		background-image: none;
		background-size: auto;
		border: none;
		border-radius: 0;
		box-shadow: none;
		-webkit-appearance: none;
		appearance: none;
	}

	.quiz-input--hidden {
		position: absolute;
		inset: 0;
		opacity: 0;
		pointer-events: none;
	}

	.quiz-input:focus,
	.quiz-input:focus-visible {
		outline: none;
		border: none;
		box-shadow: none;
	}
</style>
