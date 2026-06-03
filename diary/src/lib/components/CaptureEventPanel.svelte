<script lang="ts">
	import { tick } from 'svelte';
	import { ChromeRoundButton, PanelChromeBar } from '$lib/components/chrome';
	import '$lib/components/chrome/chrome-layout.css';
	import PanelShell from '$lib/components/navigation/PanelShell.svelte';
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
		isTop: boolean;
		visible: boolean;
		initialText?: string;
		initialKind?: EventKind | null;
		initialScore?: number;
		initialCreatedAt?: string;
		source?: string;
		focusKey?: number;
		onBack: () => void;
		onSave: (entry: EventEntry) => Promise<void>;
	}

	let {
		isTop,
		visible,
		initialText = '',
		initialKind = null,
		initialScore = 0,
		initialCreatedAt,
		source = 'main',
		focusKey = 0,
		onBack,
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
				onBack();
			}
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (!isTop) {
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

{#snippet chrome()}
	<PanelChromeBar {onBack}>
		{#snippet trailing()}
			<div class="chrome-actions">
				<ChromeRoundButton
					icon="check"
					label={i18n.t('capture.save')}
					disabled={!canSubmit}
					onclick={() => void persist(false)}
				/>
				<ChromeRoundButton
					icon="add"
					label={i18n.t('capture.saveAndAnother')}
					disabled={!canSubmit}
					onclick={() => persist(true)}
				/>
			</div>
		{/snippet}
	</PanelChromeBar>
{/snippet}

<PanelShell
	{isTop}
	{visible}
	bodyFill
	keyboardAware
	onViewportChange={resizeViewport}
	labelledBy="capture-event-title"
	{chrome}
>
	{#snippet children()}
		<h1 id="capture-event-title" class="capture-title">{i18n.t('capture.event')}</h1>

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

			</section>

			<div class="capture-gap" aria-hidden="true"></div>
		</form>
	{/snippet}
</PanelShell>

<style>
	.capture-title {
		margin: 0 0 var(--space-4);
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

</style>
