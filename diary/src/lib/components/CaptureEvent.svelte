<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import QuizTextField from '$lib/components/QuizTextField.svelte';
	import { AppIcon } from '$lib/icons';
	import type { EventEntry } from '$lib/events/types';
	import type { EventKind } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';
	import { tone } from '$lib/events/format';

	interface Props {
		open: boolean;
		initialText?: string;
		initialKind?: EventKind | null;
		initialScore?: number;
		initialCreatedAt?: string;
		source?: string;
		focusKey?: number;
		onClose: () => void;
		onSave: (entry: EventEntry) => Promise<void>;
	}

	let {
		open,
		initialText = '',
		initialKind = null,
		initialScore = 0,
		initialCreatedAt,
		source = 'main',
		focusKey = 0,
		onClose,
		onSave
	}: Props = $props();

	const i18n = useI18n();

	const MIN_LINES = 2;
	const BUFFER_LINES = 1;

	let eventText = $state('');
	let eventKind = $state<EventKind | null>(null);
	let score = $state(0);
	let inputFocused = $state(false);
	let saving = $state(false);
	let createdAtOverride = $state<string | null>(null);
	let resizeTrigger = $state(0);
	let validationAnimating = $state(false);
	let validationTimer: ReturnType<typeof setTimeout> | null = null;

	const textMissing = $derived(eventText.trim().length === 0);
	const kindMissing = $derived(eventKind === null);
	const scoreMissing = $derived(score === 0);
	const canSubmit = $derived(!saving);

	function resetForm(
		text = '',
		kind: EventKind | null = null,
		scoreValue = 0,
		createdAt: string | null = null
	): void {
		eventText = text;
		eventKind = kind;
		score = scoreValue;
		createdAtOverride = createdAt;
		inputFocused = false;
		validationAnimating = false;
		if (validationTimer) {
			clearTimeout(validationTimer);
			validationTimer = null;
		}
	}

	async function focusInput(options: { haptic?: boolean } = {}): Promise<void> {
		inputFocused = true;
		if (options.haptic !== false) {
			void hapticLight();
		}
	}

	function resizeViewport(): void {
		queueMicrotask(() => { resizeTrigger += 1; });
	}

	async function persist(andAnother: boolean): Promise<void> {
		const text = eventText.trim();
		if (!text || eventKind === null || score === 0 || saving) {
			if (validationTimer) {
				clearTimeout(validationTimer);
				validationTimer = null;
			}
			validationAnimating = false;
			await tick();
			validationAnimating = true;
			validationTimer = setTimeout(() => {
				validationAnimating = false;
				validationTimer = null;
			}, 460);
			if (!text) void focusInput();
			void hapticLight();
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
			track('event_saved', {
				score: entry.score,
				tone: tone(entry.score),
				kind: entry.kind,
				source,
				andAnother
			});
			void hapticLight();

			if (andAnother) {
				resetForm('', initialKind, initialScore, createdAtOverride);
				await focusInput({ haptic: false });
			} else {
				onClose();
			}
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (!open) {
			validationAnimating = false;
			if (validationTimer) {
				clearTimeout(validationTimer);
				validationTimer = null;
			}
			return;
		}
		focusKey;
		resetForm(
			initialText,
			initialKind,
			initialScore,
			initialCreatedAt ?? null
		);
		void tick().then(() => {
			void focusInput({ haptic: false });
		});
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
				<div class:invalid-control={validationAnimating && kindMissing}>
					<EventKindSwitcher bind:value={eventKind} />
				</div>

				<div class:invalid-control={validationAnimating && textMissing}>
					<QuizTextField
						bind:value={eventText}
						bind:focused={inputFocused}
						placeholder={i18n.t('analysis.writePlaceholder')}
						ariaLabel={i18n.t('capture.event')}
						minLines={MIN_LINES}
						bufferLines={BUFFER_LINES}
						{resizeTrigger}
						{editIcon}
					/>
				</div>

				<div class:invalid-control={validationAnimating && scoreMissing}>
					<ScorePicker bind:value={score} ariaLabel={i18n.t('capture.resonance')} />
				</div>

				<nav class="capture-nav capture-step__footer" aria-label={i18n.t('capture.newEvent')}>
					<button
						type="submit"
						class="quiz-arrow"
						disabled={!canSubmit}
						aria-label={i18n.t('capture.save')}
					>
						<AppIcon name="check" />
					</button>

					<button
						type="button"
						class="quiz-arrow"
						disabled={!canSubmit}
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

	.capture-step :global(.score-picker-wrap) {
		margin-top: var(--space-3);
	}

	.invalid-control {
		animation: validation-shake 420ms var(--ease);
	}

	.invalid-control :global(.quiz-input) {
		animation: validation-warmth 420ms var(--ease);
	}

	.invalid-control :global(.score-picker-dot) {
		animation: validation-dot-warmth 420ms var(--ease);
	}

	@keyframes validation-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-0.22rem);
		}
		40% {
			transform: translateX(0.18rem);
		}
		60% {
			transform: translateX(-0.12rem);
		}
		80% {
			transform: translateX(0.08rem);
		}
	}

	@keyframes validation-warmth {
		0%,
		100% {
			border-color: var(--border);
			background-color: transparent;
		}
		45% {
			border-color: color-mix(in srgb, var(--accent-rose) 54%, var(--border));
			background-color: color-mix(in srgb, var(--accent-rose) 9%, transparent);
		}
	}

	@keyframes validation-dot-warmth {
		0%,
		100% {
			filter: none;
			transform: scale(1);
		}
		45% {
			filter: brightness(1.55) saturate(1.35);
			transform: scale(1.18);
		}
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
