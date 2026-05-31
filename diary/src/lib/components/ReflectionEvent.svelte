<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import { AppIcon } from '$lib/icons';
	import { normalizeEventKind, type EventKind } from '$lib/events/event-kind';
	import type { EventEntry, ReflectionProtocol } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { shouldSaveReflectionScore } from '$lib/events/reflection-status';
	import { protocolFieldLabel } from '$lib/events/format';
	import QuizTextField from '$lib/components/QuizTextField.svelte';

	interface Props {
		open: boolean;
		entry: EventEntry | null;
		onClose: () => void;
		onPersist: (entry: EventEntry) => Promise<void>;
		onComplete: (entry: EventEntry) => Promise<void>;
	}

	let { open, entry, onClose, onPersist, onComplete }: Props = $props();

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
	let inputFocused = $state(false);

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
	});

	$effect(() => {
		if (!open) {
			editingEvent = false;
			loadedEntryId = null;
			inputFocused = false;
		}
	});

	function resizeEventInput(): void {
		const el = eventInput;
		if (!el) return;

		el.style.height = 'auto';
		const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
		if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

		const contentLines = Math.max(1, Math.ceil(el.scrollHeight / lineHeight));
		el.style.height = `${contentLines * lineHeight}px`;
	}

	async function focusEventInput(): Promise<void> {
		editingEvent = true;
		await tick();
		requestAnimationFrame(() => {
			eventInput?.focus({ preventScroll: true });
			resizeEventInput();
		});
		void hapticLight();
	}

	function resizeViewport(): void {
		resizeEventInput();
	}

	$effect(() => {
		if (!open || !editingEvent) return;
		draft.event;
		void tick().then(() => resizeEventInput());
	});

	$effect(() => {
		if (!open || !entry || isResonanceStep) return;
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
		} finally {
			saving = false;
		}
	}

	async function goBack(): Promise<void> {
		if (!canGoBack || saving) return;
		await persistDraft();
		stepIndex -= 1;
		void hapticLight();
	}

	async function goForward(): Promise<void> {
		if (!canGoForward || saving) return;
		await persistDraft();
		stepIndex += 1;
		void hapticLight();
	}

	function onEventBlur(): void {
		editingEvent = false;
	}

	async function backToArchive(): Promise<void> {
		await persistDraft();
		editingEvent = false;
		onClose();
	}

	async function completeReflection(): Promise<void> {
		const updated = buildEntry(true);
		if (!updated || saving) return;
		saving = true;
		try {
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

{#snippet header()}
	<div class="event-shell">
		<button type="button" class="event-back" onclick={() => void backToArchive()}>
			{i18n.t('analysis.back')}
		</button>

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
					oninput={resizeEventInput}
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
	</div>
{/snippet}

<AppFullscreen
	{open}
	bodyFill
	keyboardAware
	showClose={false}
	onViewportChange={resizeViewport}
	labelledBy="reflection-event-title"
	{onClose}
	{header}
>
	{#snippet children()}
		{#if entry}
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

					<nav class="quiz-nav quiz-step__footer" aria-label={i18n.t('analysis.title')}>
						<button
							type="button"
							class="quiz-arrow"
							disabled={!canGoBack || saving}
							aria-label={i18n.t('analysis.prev')}
							onclick={() => void goBack()}
						>
							<AppIcon name="chevronLeft" />
						</button>

						{#if isResonanceStep}
							<button
								type="button"
								class="quiz-arrow"
								disabled={saving}
								aria-label={i18n.t('analysis.saveReflection')}
								onclick={() => void completeReflection()}
							>
								<AppIcon name="check" />
							</button>
						{:else}
							<button
								type="button"
								class="quiz-arrow"
								disabled={!canGoForward || saving}
								aria-label={i18n.t('analysis.next')}
								onclick={() => void goForward()}
							>
								<AppIcon name="chevronRight" />
							</button>
						{/if}
					</nav>
				</section>

				<div class="reflection-gap" aria-hidden="true"></div>
			</div>
		{/if}
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

	.event-header {
		width: 100%;
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
