<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import type { EventEntry } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';

	interface Props {
		open: boolean;
		initialText?: string;
		focusKey?: number;
		onClose: () => void;
		onSave: (entry: EventEntry) => Promise<void>;
	}

	let { open, initialText = '', focusKey = 0, onClose, onSave }: Props = $props();

	const i18n = useI18n();

	const MIN_LINES = 2;
	const BUFFER_LINES = 1;

	let eventText = $state('');
	let score = $state(0);
	let eventInput = $state<HTMLTextAreaElement | null>(null);
	let eventInputWrap = $state<HTMLDivElement | null>(null);
	let inputFocused = $state(false);
	let saving = $state(false);

	const rangeFill = $derived(getRangeFill(score));
	const canSave = $derived(eventText.trim().length > 0 && !saving);
	const showInputDisplay = $derived(!inputFocused);
	const showEmptyPlaceholder = $derived(!eventText.trim());

	function getRangeFill(value: number): string {
		const marker = ((value + 10) / 20) * 100;
		return `linear-gradient(90deg,
			color-mix(in srgb, var(--accent-rose) 58%, transparent) 0%,
			color-mix(in srgb, var(--accent) 42%, transparent) 50%,
			color-mix(in srgb, var(--accent-leaf) 58%, transparent) 100%),
			linear-gradient(90deg, transparent ${marker}%, color-mix(in srgb, var(--bg) 56%, transparent) ${marker}%)`;
	}

	function scoreLabel(value: number): string {
		return value > 0 ? `+${value}` : String(value);
	}

	function tone(scoreValue: number): 'negative' | 'positive' {
		return scoreValue <= 0 ? 'negative' : 'positive';
	}

	function resetForm(text = ''): void {
		eventText = text;
		score = 0;
		inputFocused = false;
	}

	function resizeInput(): void {
		const el = eventInput;
		const wrap = eventInputWrap;
		if (!el || !wrap) return;

		const hidden = el.classList.contains('quiz-input--hidden');
		if (hidden) {
			el.style.position = 'static';
			el.style.opacity = '0';
			el.style.pointerEvents = 'none';
		}

		el.style.height = 'auto';

		const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
		if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

		const contentLines = Math.max(1, Math.ceil(el.scrollHeight / lineHeight));
		const totalLines = Math.max(MIN_LINES, contentLines + BUFFER_LINES);
		const height = `${totalLines * lineHeight}px`;

		wrap.style.minHeight = height;
		el.style.height = height;

		if (hidden) {
			el.style.position = '';
			el.style.opacity = '';
			el.style.pointerEvents = '';
		}
	}

	async function focusInput(options: { haptic?: boolean } = {}): Promise<void> {
		inputFocused = true;
		await tick();
		requestAnimationFrame(() => {
			eventInput?.focus({ preventScroll: true });
			resizeInput();
		});
		if (options.haptic !== false) {
			void hapticLight();
		}
	}

	function resizeViewport(): void {
		resizeInput();
	}

	async function persist(andAnother: boolean): Promise<void> {
		const text = eventText.trim();
		if (!text || saving) {
			void focusInput();
			return;
		}

		const entry: EventEntry = {
			id: crypto.randomUUID(),
			text,
			score,
			createdAt: new Date().toISOString(),
			protocol: { event: text, reason: '', about: '', view: '', actions: '' }
		};

		saving = true;
		try {
			await onSave(entry);
			track('event_saved', { score: entry.score, tone: tone(entry.score), andAnother });
			void hapticLight();

			if (andAnother) {
				resetForm();
				await focusInput({ haptic: false });
			} else {
				onClose();
			}
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (!open) return;
		focusKey;
		resetForm(initialText);
		void tick().then(() => {
			void focusInput({ haptic: false });
			requestAnimationFrame(() => {
				eventInput?.focus({ preventScroll: true });
			});
		});
	});

	$effect(() => {
		if (!open) return;
		eventText;
		showInputDisplay;
		showEmptyPlaceholder;
		inputFocused;
		void tick().then(resizeInput);
	});
</script>

{#snippet editIcon()}
	<svg class="inline-edit-icon" viewBox="0 0 24 24" aria-hidden="true">
		<path
			d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5Zm14.7-8.8a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-1 1 2.4 2.4 1-1Z"
		/>
	</svg>
{/snippet}

{#snippet header()}
	<div class="event-shell">
		<button type="button" class="event-back" onclick={onClose}>
			{i18n.t('analysis.back')}
		</button>

		<h1 id="capture-event-title" class="capture-title">{i18n.t('capture.event')}</h1>
	</div>
{/snippet}

<AppFullscreen
	{open}
	bodyFill
	keyboardAware
	showClose={false}
	onViewportChange={resizeViewport}
	labelledBy="capture-event-title"
	{onClose}
	{header}
>
	{#snippet children()}
		<form class="capture" onsubmit={(event) => (event.preventDefault(), void persist(false))}>
			<div class="capture-gap" aria-hidden="true"></div>

			<section class="capture-step" aria-labelledby="capture-event-title">
				<div class="quiz-input-wrap" bind:this={eventInputWrap}>
					{#if showInputDisplay}
						<button
							type="button"
							class="quiz-input-display"
							class:quiz-input-display--placeholder={showEmptyPlaceholder}
							aria-label={i18n.t('analysis.edit')}
							onclick={() => void focusInput()}
						>
							{#if showEmptyPlaceholder}
								{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
							{:else}
								{eventText}{@render editIcon()}
							{/if}
						</button>
					{:else if showEmptyPlaceholder}
						<div class="quiz-input-placeholder" aria-hidden="true">
							{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
						</div>
					{/if}
					<textarea
						id="capture-event-text"
						bind:this={eventInput}
						class="quiz-input"
						class:quiz-input--hidden={showInputDisplay}
						bind:value={eventText}
						rows={MIN_LINES}
						aria-label={i18n.t('capture.event')}
						onfocus={() => (inputFocused = true)}
						onblur={() => (inputFocused = false)}
						oninput={resizeInput}
					></textarea>
				</div>

				<div class="capture-resonance">
					<div class="rf-score-row">
						<p class="rf-score-value" class:positive={score > 0} class:negative={score <= 0}>
							{scoreLabel(score)}
						</p>
					</div>
					<input
						type="range"
						min="-10"
						max="10"
						step="1"
						aria-label={i18n.t('capture.resonance')}
						bind:value={score}
						style:--range-fill={rangeFill}
					/>
					<div class="scale-labels" aria-hidden="true">
						<span>-10</span>
						<span>0</span>
						<span>+10</span>
					</div>
				</div>

				<nav class="capture-nav" aria-label={i18n.t('capture.newEvent')}>
					<button
						type="submit"
						class="quiz-arrow"
						disabled={!canSave}
						aria-label={i18n.t('capture.save')}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M9.55 17.05 4.5 12l1.4-1.42 3.65 3.65 8.55-8.55 1.4 1.42-9.95 9.97Z" />
						</svg>
					</button>

					<button
						type="button"
						class="quiz-arrow"
						disabled={!canSave}
						aria-label={i18n.t('capture.saveAndAnother')}
						onclick={() => persist(true)}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
						</svg>
					</button>
				</nav>
			</section>

			<div class="capture-gap" aria-hidden="true"></div>
		</form>
	{/snippet}
</AppFullscreen>

<style>
	.event-shell {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
	}

	.event-back {
		align-self: flex-start;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 400;
		line-height: var(--leading-normal);
		color: var(--text-muted);
		cursor: pointer;
		transition: color var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.event-back:hover,
	.event-back:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.capture-title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.capture {
		display: grid;
		grid-template-rows: minmax(var(--space-3), 1fr) auto minmax(var(--space-3), 1fr);
		flex: 1;
		min-height: 0;
		height: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		width: 100%;
	}

	.capture-gap {
		min-height: 0;
	}

	.capture-step {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.inline-edit-icon {
		display: inline-block;
		width: 1.25rem;
		height: 1.25rem;
		margin-inline-start: 0.25em;
		vertical-align: -0.14em;
		fill: currentColor;
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

	.quiz-input-placeholder .inline-edit-icon {
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

	.capture-resonance {
		display: grid;
		gap: var(--space-4);
	}

	.rf-score-row {
		display: flex;
		justify-content: flex-end;
	}

	.rf-score-value {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		line-height: 1;
	}

	.rf-score-value.positive {
		color: var(--accent-leaf);
	}

	.rf-score-value.negative {
		color: var(--accent-rose);
	}

	.scale-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-xs);
		color: var(--text-faint);
	}

	.capture-nav {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
	}

	.quiz-arrow {
		display: grid;
		place-items: center;
		width: var(--size-touch);
		height: var(--size-touch);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--fill-subtle);
		color: var(--text-muted);
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.quiz-arrow svg {
		width: var(--text-lg);
		height: var(--text-lg);
		fill: currentColor;
	}

	.quiz-arrow:hover:not(:disabled),
	.quiz-arrow:focus-visible:not(:disabled) {
		border-color: var(--accent-dim);
		color: var(--text);
	}

	.quiz-arrow:disabled {
		opacity: 0.28;
		cursor: not-allowed;
	}
</style>
