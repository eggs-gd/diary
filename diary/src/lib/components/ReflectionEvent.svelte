<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import type { EventEntry, ReflectionProtocol } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { shouldSaveReflectionScore } from '$lib/events/reflection-status';

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
	let editingEvent = $state(false);
	let saving = $state(false);
	let stepIndex = $state(0);
	let loadedEntryId = $state<string | null>(null);
	let quizInput = $state<HTMLTextAreaElement | null>(null);
	let quizInputWrap = $state<HTMLDivElement | null>(null);
	let eventInput = $state<HTMLTextAreaElement | null>(null);
	let inputFocused = $state(false);

	const protocolFields = ['reason', 'about', 'view', 'actions'] as const;
	const totalSteps = protocolFields.length + 1;
	const isResonanceStep = $derived(stepIndex === protocolFields.length);
	const currentField = $derived(protocolFields[stepIndex] ?? protocolFields[0]);
	const showInputDisplay = $derived(!inputFocused);
	const showEmptyPlaceholder = $derived(!draft[currentField]?.trim());
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
	});

	$effect(() => {
		if (!open) {
			editingEvent = false;
			loadedEntryId = null;
			inputFocused = false;
		}
	});

	async function focusQuizInput(): Promise<void> {
		inputFocused = true;
		await tick();
		requestAnimationFrame(() => {
			quizInput?.focus({ preventScroll: true });
			resizeQuizInput();
		});
	}

	function resizeQuizInput(): void {
		const el = quizInput;
		const wrap = quizInputWrap;
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
		const totalLines = Math.max(QUIZ_MIN_LINES, contentLines + QUIZ_BUFFER_LINES);
		const height = `${totalLines * lineHeight}px`;

		wrap.style.minHeight = height;
		el.style.height = height;

		if (hidden) {
			el.style.position = '';
			el.style.opacity = '';
			el.style.pointerEvents = '';
		}
	}

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
		resizeQuizInput();
		resizeEventInput();
	}

	$effect(() => {
		if (!open || isResonanceStep || !entry) return;
		draft[currentField];
		stepIndex;
		showInputDisplay;
		showEmptyPlaceholder;
		inputFocused;
		void tick().then(() => resizeQuizInput());
	});

	$effect(() => {
		if (!open || !editingEvent) return;
		draft.event;
		void tick().then(() => resizeEventInput());
	});

	$effect(() => {
		if (!open || !entry || isResonanceStep) return;
		stepIndex;

		inputFocused = false;
		void tick().then(() => quizInput?.blur());
	});

	function reflectionLabel(key: (typeof protocolFields)[number]): string {
		const prefix = (entry?.score ?? 0) <= 0 ? 'negative' : 'positive';
		const map: Record<(typeof protocolFields)[number], string> = {
			reason: i18n.t(`analysis.${prefix}Reason`),
			about: i18n.t(`analysis.${prefix}About`),
			view: i18n.t(`analysis.${prefix}View`),
			actions: i18n.t(`analysis.${prefix}Actions`)
		};
		return map[key];
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
		return { ...entry, text: draft.event.trim() || entry.text, protocol };
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
			await onPersist(updated);
			await onComplete(updated);
			editingEvent = false;
		} finally {
			saving = false;
		}
	}
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
						<ScorePicker
							bind:value={reflectionScore}
							ariaLabel={i18n.t('analysis.resonanceQuestion')}
						/>
					{:else}
						<div class="quiz-input-wrap" bind:this={quizInputWrap}>
							{#if showInputDisplay}
								<button
									type="button"
									class="quiz-input-display"
									class:quiz-input-display--placeholder={showEmptyPlaceholder}
									aria-label={i18n.t('analysis.edit')}
									onclick={() => void focusQuizInput()}
								>
									{#if showEmptyPlaceholder}
										{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
									{:else}
										{draft[currentField]}{@render editIcon()}
									{/if}
								</button>
							{:else if showEmptyPlaceholder}
								<div class="quiz-input-placeholder" aria-hidden="true">
									{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
								</div>
							{/if}
							<textarea
								bind:this={quizInput}
								class="quiz-input"
								class:quiz-input--hidden={showInputDisplay}
								bind:value={draft[currentField]}
								rows={QUIZ_MIN_LINES}
								aria-label={reflectionLabel(currentField)}
								onfocus={() => (inputFocused = true)}
								onblur={() => (inputFocused = false)}
								oninput={resizeQuizInput}
							></textarea>
						</div>
					{/if}

					<nav class="quiz-nav quiz-step__footer" aria-label={i18n.t('analysis.title')}>
						<button
							type="button"
							class="quiz-arrow"
							disabled={!canGoBack || saving}
							aria-label={i18n.t('analysis.prev')}
							onclick={() => void goBack()}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41Z" />
							</svg>
						</button>

						{#if isResonanceStep}
							<button
								type="button"
								class="quiz-arrow"
								disabled={saving}
								aria-label={i18n.t('analysis.saveReflection')}
								onclick={() => void completeReflection()}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path
										d="M9.55 17.05 4.5 12l1.4-1.42 3.65 3.65 8.55-8.55 1.4 1.42-9.95 9.97Z"
									/>
								</svg>
							</button>
						{:else}
							<button
								type="button"
								class="quiz-arrow"
								disabled={!canGoForward || saving}
								aria-label={i18n.t('analysis.next')}
								onclick={() => void goForward()}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z" />
								</svg>
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

	.inline-edit-icon {
		display: inline-block;
		width: 1.125rem;
		height: 1.125rem;
		margin-inline-start: 0.25em;
		vertical-align: -0.12em;
		fill: currentColor;
		color: var(--text-soft);
	}

	.event-header__title .inline-edit-icon {
		width: 1.375rem;
		height: 1.375rem;
		vertical-align: -0.14em;
		color: var(--text);
	}

	.quiz-input-display .inline-edit-icon {
		width: 1.25rem;
		height: 1.25rem;
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

	.quiz-input::placeholder {
		color: var(--text-faint);
	}

	.quiz-input:focus,
	.quiz-input:focus-visible {
		outline: none;
		border: none;
		box-shadow: none;
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
