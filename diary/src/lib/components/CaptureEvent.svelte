<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import QuizTextField from '$lib/components/QuizTextField.svelte';
	import { AppIcon } from '$lib/icons';
	import type { EventEntry } from '$lib/events/types';
	import { DEFAULT_EVENT_KIND, type EventKind } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';
	import { tone } from '$lib/events/format';

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
	let inputFocused = $state(false);
	let saving = $state(false);
	let createdAtOverride = $state<string | null>(null);
	let resizeTrigger = $state(0);

	const canSave = $derived(eventText.trim().length > 0 && !saving);

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
				<EventKindSwitcher bind:value={eventKind} />

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
