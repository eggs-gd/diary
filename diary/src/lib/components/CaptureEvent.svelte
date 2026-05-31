<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import { AppIcon } from '$lib/icons';
	import type { EventEntry } from '$lib/events/types';
	import { DEFAULT_EVENT_KIND, type EventKind } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';

	interface Props {
		open: boolean;
		initialText?: string;
		initialKind?: EventKind;
		initialScore?: number;
		initialCreatedAt?: string;
		focusKey?: number;
		onClose: () => void;
		onSave: (entry: EventEntry) => Promise<void>;
	}

	let {
		open,
		initialText = '',
		initialKind = DEFAULT_EVENT_KIND,
		initialScore = 0,
		initialCreatedAt,
		focusKey = 0,
		onClose,
		onSave
	}: Props = $props();

	const i18n = useI18n();

	const MIN_LINES = 2;
	const BUFFER_LINES = 1;

	let eventText = $state('');
	let eventKind = $state<EventKind>(DEFAULT_EVENT_KIND);
	let score = $state(0);
	let eventInput = $state<HTMLTextAreaElement | null>(null);
	let eventInputWrap = $state<HTMLDivElement | null>(null);
	let inputFocused = $state(false);
	let saving = $state(false);
	let createdAtOverride = $state<string | null>(null);

	const canSave = $derived(eventText.trim().length > 0 && !saving);
	const showInputDisplay = $derived(!inputFocused);
	const showEmptyPlaceholder = $derived(!eventText.trim());

	function tone(scoreValue: number): 'negative' | 'positive' {
		return scoreValue <= 0 ? 'negative' : 'positive';
	}

	function resetForm(
		text = '',
		kind: EventKind = DEFAULT_EVENT_KIND,
		scoreValue = 0,
		createdAt: string | null = null
	): void {
		eventText = text;
		eventKind = kind;
		score = scoreValue;
		createdAtOverride = createdAt;
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
			kind: eventKind,
			createdAt: createdAtOverride ?? new Date().toISOString(),
			protocol: { event: text, reason: '', about: '', view: '', actions: '' }
		};

		saving = true;
		try {
			await onSave(entry);
			track('event_saved', { score: entry.score, tone: tone(entry.score), kind: entry.kind, andAnother });
			void hapticLight();

			if (andAnother) {
				resetForm('', eventKind, score, createdAtOverride);
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
		resetForm(
			initialText,
			initialKind,
			initialScore,
			initialCreatedAt ?? null
		);
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
	<AppIcon name="edit" class="inline-edit-icon" />
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
				<EventKindSwitcher bind:value={eventKind} />

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

				<ScorePicker bind:value={score} ariaLabel={i18n.t('capture.resonance')} />

				<nav class="capture-nav capture-step__footer" aria-label={i18n.t('capture.newEvent')}>
					<button
						type="submit"
						class="quiz-arrow"
						disabled={!canSave}
						aria-label={i18n.t('capture.save')}
					>
						<AppIcon name="check" />
					</button>

					<button
						type="button"
						class="quiz-arrow"
						disabled={!canSave}
						aria-label={i18n.t('capture.saveAndAnother')}
						onclick={() => persist(true)}
					>
						<AppIcon name="add" />
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
	}

	.capture-step :global(.kind-switcher) {
		margin-bottom: var(--space-3);
	}

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

	.capture-step :global(.score-picker-wrap) {
		margin-top: var(--space-3);
	}

	.capture-step__footer {
		margin-top: var(--space-4);
		flex-shrink: 0;
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

	.quiz-arrow :global(svg.app-icon) {
		width: var(--text-lg);
		height: var(--text-lg);
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
