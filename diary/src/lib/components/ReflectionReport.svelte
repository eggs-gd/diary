<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import { AppIcon } from '$lib/icons';
	import { normalizeEventKind, type EventKind } from '$lib/events/event-kind';
	import type { EventEntry, ReflectionProtocol } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';
	import { resizeQuizTextarea } from '$lib/utils/resize-quiz-textarea';

	const protocolFields = ['reason', 'about', 'view', 'actions'] as const;
	type ProtocolField = (typeof protocolFields)[number];

	interface Props {
		open: boolean;
		entry: EventEntry | null;
		onClose: () => void;
		onPersist: (entry: EventEntry) => Promise<void>;
	}

	let { open, entry, onClose, onPersist }: Props = $props();

	const i18n = useI18n();

	const MIN_LINES = 2;
	const BUFFER_LINES = 1;

	let draft = $state<Pick<ReflectionProtocol, 'event' | 'reason' | 'about' | 'view' | 'actions'>>({
		event: '',
		reason: '',
		about: '',
		view: '',
		actions: ''
	});
	let reflectionScore = $state(0);
	let eventKind = $state<EventKind>('event');
	let saving = $state(false);
	let loadedSnapshot = $state<string | null>(null);
	let editingEvent = $state(false);
	let focusedField = $state<ProtocolField | null>(null);

	let baselineDraft = $state({
		event: '',
		reason: '',
		about: '',
		view: '',
		actions: ''
	});
	let baselineReflectionScore = $state(0);
	let baselineEventKind = $state<EventKind>('event');

	let eventInput = $state<HTMLTextAreaElement | null>(null);
	let fieldInputs = $state<Partial<Record<ProtocolField, HTMLTextAreaElement>>>({});
	let fieldWraps = $state<Partial<Record<ProtocolField, HTMLDivElement>>>({});

	const hasChanges = $derived(
		draft.event.trim() !== baselineDraft.event.trim() ||
			draft.reason.trim() !== baselineDraft.reason.trim() ||
			draft.about.trim() !== baselineDraft.about.trim() ||
			draft.view.trim() !== baselineDraft.view.trim() ||
			draft.actions.trim() !== baselineDraft.actions.trim() ||
			reflectionScore !== baselineReflectionScore ||
			eventKind !== baselineEventKind
	);
	const canSave = $derived(hasChanges && !saving);

	function entrySnapshot(source: EventEntry): string {
		return JSON.stringify({
			text: source.text,
			kind: source.kind,
			score: source.score,
			protocol: source.protocol ?? null
		});
	}

	function loadFromEntry(source: EventEntry): void {
		const protocol = source.protocol;
		const nextDraft = {
			event: protocol?.event ?? source.text,
			reason: protocol?.reason ?? '',
			about: protocol?.about ?? '',
			view: protocol?.view ?? '',
			actions: protocol?.actions ?? ''
		};
		draft = nextDraft;
		baselineDraft = { ...nextDraft };
		reflectionScore = protocol?.reflectionScore ?? source.score;
		baselineReflectionScore = reflectionScore;
		eventKind = normalizeEventKind(source.kind);
		baselineEventKind = eventKind;
		editingEvent = false;
		focusedField = null;
	}

	$effect(() => {
		if (!open || !entry) return;

		const snapshot = entrySnapshot(entry);
		if (snapshot === loadedSnapshot) return;

		loadedSnapshot = snapshot;
		loadFromEntry(entry);
	});

	$effect(() => {
		if (open) return;
		loadedSnapshot = null;
		editingEvent = false;
		focusedField = null;
	});

	$effect(() => {
		if (!open || !entry) return;
		draft.reason;
		draft.about;
		draft.view;
		draft.actions;
		focusedField;
		void tick().then(() => {
			for (const field of protocolFields) {
				resizeField(field);
			}
		});
	});

	$effect(() => {
		if (!open || !editingEvent) return;
		draft.event;
		void tick().then(() => resizeEventInput());
	});

	function reflectionLabel(field: ProtocolField): string {
		const prefix = (entry?.score ?? 0) <= 0 ? 'negative' : 'positive';
		const map: Record<ProtocolField, string> = {
			reason: i18n.t(`analysis.${prefix}Reason`),
			about: i18n.t(`analysis.${prefix}About`),
			view: i18n.t(`analysis.${prefix}View`),
			actions: i18n.t(`analysis.${prefix}Actions`)
		};
		return map[field];
	}

	function resizeField(field: ProtocolField): void {
		const el = fieldInputs[field] ?? null;
		const wrap = fieldWraps[field] ?? null;
		if (!el || !wrap) return;

		resizeQuizTextarea(el, wrap, { minLines: MIN_LINES, bufferLines: BUFFER_LINES });
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

	async function focusField(field: ProtocolField): Promise<void> {
		focusedField = field;
		await tick();
		requestAnimationFrame(() => {
			fieldInputs[field]?.focus({ preventScroll: true });
			resizeField(field);
		});
		void hapticLight();
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

	function onFieldBlur(field: ProtocolField): void {
		if (focusedField === field) {
			focusedField = null;
		}
	}

	function onEventBlur(): void {
		editingEvent = false;
	}

	function buildEntry(): EventEntry | null {
		if (!entry) return null;

		const protocol: ReflectionProtocol = {
			...draft,
			reflectionScore
		};

		return {
			...entry,
			text: draft.event.trim() || entry.text,
			kind: eventKind,
			protocol
		};
	}

	async function persist(closeAfter = false): Promise<void> {
		if (!hasChanges || saving) return;

		const updated = buildEntry();
		if (!updated) return;

		saving = true;
		try {
			await onPersist(updated);
			baselineDraft = { ...draft };
			baselineReflectionScore = reflectionScore;
			baselineEventKind = eventKind;
			track('reflection_report_saved', { score: reflectionScore });
			void hapticLight();
			if (closeAfter) onClose();
		} finally {
			saving = false;
		}
	}

	async function backToArchive(): Promise<void> {
		if (hasChanges) {
			await persist(false);
		}
		onClose();
	}
</script>

{#snippet editIcon()}
	<AppIcon name="edit" class="inline-edit-icon" />
{/snippet}

{#snippet header()}
	<div class="report-header">
		<button type="button" class="report-back" onclick={() => void backToArchive()}>
			{i18n.t('analysis.back')}
		</button>

		<div class="report-title-wrap">
			{#if editingEvent}
				<textarea
					id="reflection-report-title"
					bind:this={eventInput}
					class="report-title__input"
					bind:value={draft.event}
					rows="1"
					aria-label={i18n.t('capture.event')}
					onblur={onEventBlur}
					oninput={resizeEventInput}
				></textarea>
			{:else}
				<button
					type="button"
					id="reflection-report-title"
					class="report-title"
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
	labelledBy="reflection-report-title"
	showClose={false}
	onClose={() => void backToArchive()}
	{header}
>
	{#snippet children()}
		{#if entry}
			<article class="reflection-report">
				{#each protocolFields as field (field)}
					{@const showDisplay = focusedField !== field}
					{@const showPlaceholder = !draft[field].trim()}
					<section class="report-section" aria-labelledby="report-{field}">
						<h2 class="quiz-question" id="report-{field}">{reflectionLabel(field)}</h2>
						<div class="quiz-input-wrap" bind:this={fieldWraps[field]}>
							{#if showDisplay}
								<button
									type="button"
									class="quiz-input-display"
									class:quiz-input-display--placeholder={showPlaceholder}
									aria-label={i18n.t('analysis.edit')}
									onclick={() => void focusField(field)}
								>
									{#if showPlaceholder}
										{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
									{:else}
										{draft[field]}{@render editIcon()}
									{/if}
								</button>
							{:else if showPlaceholder}
								<div class="quiz-input-placeholder" aria-hidden="true">
									{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
								</div>
							{/if}
							<textarea
								bind:this={fieldInputs[field]}
								class="quiz-input"
								class:quiz-input--hidden={showDisplay}
								bind:value={draft[field]}
								rows="1"
								aria-label={reflectionLabel(field)}
								onfocus={() => (focusedField = field)}
								onblur={() => onFieldBlur(field)}
								oninput={() => resizeField(field)}
							></textarea>
						</div>
					</section>
				{/each}

				<section class="report-section report-section--score" aria-labelledby="report-resonance">
					<h2 class="quiz-question" id="report-resonance">{i18n.t('analysis.resonanceQuestion')}</h2>
					<EventKindSwitcher bind:value={eventKind} />
					<ScorePicker
						bind:value={reflectionScore}
						ariaLabel={i18n.t('analysis.resonanceQuestion')}
					/>
				</section>

				<footer class="report-footer">
					<button
						type="button"
						class="report-save"
						disabled={!canSave}
						aria-label={i18n.t('analysis.saveReflection')}
						onclick={() => void persist(true)}
					>
						<AppIcon name="check" />
					</button>
				</footer>
			</article>
		{/if}
	{/snippet}
</AppFullscreen>

<style>
	.report-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
	}

	.report-back {
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

	.report-back:hover,
	.report-back:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.report-title-wrap {
		width: 100%;
		min-width: 0;
	}

	.report-title {
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

	.report-title__input {
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

	.report-title__input:focus {
		outline: none;
	}

	.reflection-report {
		display: grid;
		gap: var(--space-5);
		max-width: var(--content-max-width);
		margin: 0 auto;
		width: 100%;
		padding-bottom: var(--space-4);
	}

	.report-section {
		display: grid;
		gap: var(--space-2);
	}

	.report-section--score :global(.kind-switcher) {
		margin-bottom: var(--space-2);
	}

	.report-section--score :global(.score-picker-wrap) {
		margin-top: var(--space-1);
	}

	.quiz-question {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
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
	}

	.report-footer {
		display: flex;
		justify-content: flex-end;
		padding-top: var(--space-2);
	}

	.report-save {
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

	.report-save :global(svg.app-icon) {
		width: var(--text-lg);
		height: var(--text-lg);
	}

	.report-save:hover:not(:disabled),
	.report-save:focus-visible:not(:disabled) {
		border-color: var(--accent-dim);
		color: var(--text);
		outline: none;
	}

	.report-save:disabled {
		opacity: 0.28;
		cursor: not-allowed;
	}
</style>
