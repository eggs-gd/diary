<script lang="ts">
	import { tick } from 'svelte';
	import { ChromeRoundButton, PanelChromeBar } from '$lib/components/chrome';
	import PanelShell from '$lib/components/navigation/PanelShell.svelte';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import { AppIcon } from '$lib/icons';
	import { normalizeEventKind, type EventKind } from '$lib/events/event-kind';
	import type { EventEntry, ReflectionProtocol } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { protocolFilledCount, shouldSaveReflectionScore } from '$lib/events/reflection-status';
	import { protocolFieldLabel } from '$lib/events/format';
	import QuizTextField from '$lib/components/QuizTextField.svelte';
	import { resizeTextareaToContent } from '$lib/utils/resize-quiz-textarea';
	import { track } from '$lib/analytics';

	interface Props {
		isTop: boolean;
		visible: boolean;
		entry: EventEntry | null;
		onBack: () => void;
		onPersist: (entry: EventEntry) => Promise<void>;
		onComplete: (entry: EventEntry) => Promise<void>;
	}

	let { isTop, visible, entry, onBack, onPersist, onComplete }: Props = $props();

	const i18n = useI18n();

	let draft = $state<Pick<ReflectionProtocol, 'event' | 'reason' | 'about' | 'view' | 'actions'>>({
		event: '',
		reason: '',
		about: '',
		view: '',
		actions: ''
	});
	let reflectionScore = $state(0);
	let eventKind = $state<EventKind>('event');
	let editingEvent = $state(false);
	let saving = $state(false);
	let stepIndex = $state(0);
	let loadedEntryId = $state<string | null>(null);
	let eventInput = $state<HTMLTextAreaElement | null>(null);
	let eventInputResizeFrame: number | null = null;
	let inputFocused = $state(false);
	let trackedStepKey = $state('');

	const protocolFields = ['reason', 'about', 'view', 'actions'] as const;
	const totalSteps = protocolFields.length + 1;
	const isResonanceStep = $derived(stepIndex === protocolFields.length);
	const currentField = $derived(protocolFields[stepIndex] ?? protocolFields[0]);
	const canGoBack = $derived(stepIndex > 0);
	const canGoForward = $derived(stepIndex < totalSteps - 1);

	const QUIZ_MIN_LINES = 2;
	const QUIZ_BUFFER_LINES = 1;

	$effect(() => {
		if (!entry || entry.id === loadedEntryId) return;

		loadedEntryId = entry.id;
		stepIndex = 0;
		editingEvent = false;
		inputFocused = false;

		const p = entry.protocol;
		draft = {
			event: p?.event ?? entry.text,
			reason: p?.reason ?? '',
			about: p?.about ?? '',
			view: p?.view ?? '',
			actions: p?.actions ?? ''
		};
		reflectionScore = p?.reflectionScore ?? entry.score;
		eventKind = normalizeEventKind(entry.kind);
		trackedStepKey = '';
	});

	$effect(() => {
		if (!isTop) {
			editingEvent = false;
			loadedEntryId = null;
			inputFocused = false;
			trackedStepKey = '';
		}
	});

	$effect(() => {
		if (!isTop || !entry) return;
		const stepKey = `${entry.id}:${stepIndex}`;
		if (stepKey === trackedStepKey) return;
		trackedStepKey = stepKey;
		track('reflection_quiz_step_viewed', {
			step: stepIndex + 1,
			totalSteps,
			field: isResonanceStep ? 'resonance' : currentField,
			score: entry.score,
			filledFields: protocolFilledCount(draft)
		});
	});

	function resizeEventInput(): void {
		const el = eventInput;
		if (!el) return;
		resizeTextareaToContent(el);
	}

	function queueEventInputResize(): void {
		if (eventInputResizeFrame !== null) return;
		eventInputResizeFrame = requestAnimationFrame(() => {
			eventInputResizeFrame = null;
			resizeEventInput();
		});
	}

	async function focusEventInput(): Promise<void> {
		editingEvent = true;
		await tick();
		requestAnimationFrame(() => {
			eventInput?.focus({ preventScroll: true });
			queueEventInputResize();
		});
		void hapticLight();
	}

	function resizeViewport(): void {
		queueEventInputResize();
	}

	$effect(() => {
		if (!isTop || !editingEvent) return;
		draft.event;
		void tick().then(queueEventInputResize);
	});

	$effect(() => {
		return () => {
			if (eventInputResizeFrame !== null) cancelAnimationFrame(eventInputResizeFrame);
		};
	});

	$effect(() => {
		if (!isTop || !entry || isResonanceStep) return;
		stepIndex;
		inputFocused = false;
	});

	function reflectionLabel(key: (typeof protocolFields)[number]): string {
		return protocolFieldLabel(key, entry?.score ?? 0, (k) => i18n.t(k));
	}

	function buildEntry(finalize = false): EventEntry | null {
		if (!entry) return null;
		const protocol: ReflectionProtocol = { ...draft };
		if (finalize) {
			if (shouldSaveReflectionScore(entry, draft, reflectionScore)) {
				protocol.reflectionScore = reflectionScore;
			}
		} else if (entry.protocol?.reflectionScore !== undefined) {
			protocol.reflectionScore = entry.protocol.reflectionScore;
		}
		return { ...entry, text: draft.event.trim() || entry.text, kind: eventKind, protocol };
	}

	async function persistDraft(): Promise<void> {
		const updated = buildEntry();
		if (!updated || saving) return;
		saving = true;
		try {
			await onPersist(updated);
			track('reflection_quiz_draft_saved', {
				step: stepIndex + 1,
				totalSteps,
				field: isResonanceStep ? 'resonance' : currentField,
				filledFields: protocolFilledCount(updated.protocol),
				hasReflectionScore: updated.protocol?.reflectionScore !== undefined
			});
		} finally {
			saving = false;
		}
	}

	async function goBack(): Promise<void> {
		if (!canGoBack || saving) return;
		await persistDraft();
		track('reflection_quiz_step_changed', {
			direction: 'back',
			fromStep: stepIndex + 1,
			toStep: stepIndex,
			totalSteps
		});
		stepIndex -= 1;
		void hapticLight();
	}

	async function goForward(): Promise<void> {
		if (!canGoForward || saving) return;
		await persistDraft();
		track('reflection_quiz_step_changed', {
			direction: 'forward',
			fromStep: stepIndex + 1,
			toStep: stepIndex + 2,
			totalSteps
		});
		stepIndex += 1;
		void hapticLight();
	}

	function onEventBlur(): void {
		editingEvent = false;
	}

	async function backToArchive(): Promise<void> {
		await persistDraft();
		editingEvent = false;
		onBack();
	}

	async function completeReflection(): Promise<void> {
		const updated = buildEntry(true);
		if (!updated || saving) return;
		saving = true;
		try {
			track('reflection_quiz_completed', {
				filledFields: protocolFilledCount(updated.protocol),
				hasReflectionScore: updated.protocol?.reflectionScore !== undefined,
				score: updated.protocol?.reflectionScore ?? updated.score
			});
			await onComplete(updated);
			editingEvent = false;
		} finally {
			saving = false;
		}
	}
</script>

{#snippet editIcon()}
	<AppIcon name="edit" class="inline-edit-icon" />
{/snippet}

{#snippet chrome()}
	<PanelChromeBar onBack={() => void backToArchive()}>
		{#snippet trailing()}
			{#if isResonanceStep}
				<ChromeRoundButton
					icon="check"
					label={i18n.t('analysis.saveReflection')}
					disabled={saving}
					onclick={() => void completeReflection()}
				/>
			{/if}
		{/snippet}
	</PanelChromeBar>
{/snippet}

<PanelShell
	{isTop}
	{visible}
	bodyFill
	keyboardAware
	onViewportChange={resizeViewport}
	labelledBy="reflection-event-title"
	{chrome}
>
	{#snippet children()}
		{#if entry}
			<div class="event-header">
				{#if editingEvent}
					<textarea
						id="reflection-event-title"
						bind:this={eventInput}
						class="event-header__input"
						bind:value={draft.event}
						rows="1"
						aria-label={i18n.t('capture.event')}
						onblur={onEventBlur}
						oninput={queueEventInputResize}
					></textarea>
				{:else}
					<button
						type="button"
						id="reflection-event-title"
						class="event-header__title"
						aria-label={i18n.t('analysis.edit')}
						onclick={() => void focusEventInput()}
					>
						{draft.event.trim() || entry?.text || '—'}{@render editIcon()}
					</button>
				{/if}
			</div>

			<div class="reflection">
				<div class="reflection-gap" aria-hidden="true"></div>

				<section class="quiz-step" aria-live="polite">
					<h2 class="quiz-question">
						{isResonanceStep ? i18n.t('analysis.resonanceQuestion') : reflectionLabel(currentField)}
					</h2>

					{#if isResonanceStep}
						<EventKindSwitcher bind:value={eventKind} />
						<ScorePicker
							bind:value={reflectionScore}
							ariaLabel={i18n.t('analysis.resonanceQuestion')}
						/>
					{:else}
						<QuizTextField
							bind:value={draft[currentField]}
							bind:focused={inputFocused}
							placeholder={i18n.t('analysis.writePlaceholder')}
							ariaLabel={reflectionLabel(currentField)}
							minLines={QUIZ_MIN_LINES}
							bufferLines={QUIZ_BUFFER_LINES}
							{editIcon}
						/>
					{/if}

					<nav
						class="quiz-nav quiz-step__footer"
						class:quiz-nav--next-only={!canGoBack && !isResonanceStep}
						aria-label={i18n.t('analysis.title')}
					>
						{#if canGoBack}
							<ChromeRoundButton
								icon="chevronLeft"
								label={i18n.t('analysis.prev')}
								disabled={saving}
								onclick={() => void goBack()}
							/>
						{/if}
						{#if !isResonanceStep}
							<ChromeRoundButton
								icon="chevronRight"
								label={i18n.t('analysis.next')}
								disabled={!canGoForward || saving}
								onclick={() => void goForward()}
							/>
						{/if}
					</nav>
				</section>

				<div class="reflection-gap" aria-hidden="true"></div>
			</div>
		{/if}
	{/snippet}
</PanelShell>

<style>
	.event-header {
		width: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto var(--space-3);
	}

	.event-header__title {
		display: block;
		width: 100%;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		text-align: left;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
		cursor: text;
		white-space: pre-wrap;
		word-break: break-word;
		-webkit-tap-highlight-color: transparent;
	}

	.event-header__input {
		width: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		line-height: var(--leading-tight);
		resize: none;
		min-height: 0;
	}

	.event-header__input:focus {
		outline: none;
	}

	:global(svg.inline-edit-icon) {
		display: inline-block;
		width: 1.125rem;
		height: 1.125rem;
		margin-inline-start: 0.25em;
		vertical-align: -0.12em;
		color: var(--text-soft);
	}

	.event-header__title :global(svg.inline-edit-icon) {
		width: 1.375rem;
		height: 1.375rem;
		vertical-align: -0.14em;
		color: var(--text);
	}

	.reflection {
		display: grid;
		grid-template-rows: minmax(var(--space-3), 1fr) auto minmax(var(--space-3), 1fr);
		flex: 1;
		min-height: 0;
		height: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		width: 100%;
	}

	.reflection-gap {
		min-height: 0;
	}

	.quiz-step {
		display: flex;
		flex-direction: column;
	}

	.quiz-step :global(.kind-switcher) {
		margin-bottom: var(--space-3);
	}

	.quiz-step__footer {
		margin-top: var(--space-4);
		flex-shrink: 0;
	}

	.quiz-question {
		margin: 0 0 var(--space-3);
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.quiz-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		width: 100%;
		margin: 0;
	}

	.quiz-nav--next-only {
		justify-content: flex-end;
	}
</style>
