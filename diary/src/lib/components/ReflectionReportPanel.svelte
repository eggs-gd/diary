<script lang="ts">
	import { tick } from 'svelte';
	import { ChromeRoundButton, PanelChromeBar } from '$lib/components/chrome';
	import PanelShell from '$lib/components/navigation/PanelShell.svelte';
	import EventKindSwitcher from '$lib/components/EventKindSwitcher.svelte';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import QuizTextField from '$lib/components/QuizTextField.svelte';
	import { AppIcon } from '$lib/icons';
	import { normalizeEventKind, type EventKind } from '$lib/events/event-kind';
	import type { EventEntry, ReflectionProtocol } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';
	import { protocolFieldLabel } from '$lib/events/format';
	import { getReflectionStatus, protocolFilledCount, shouldSaveReflectionScore } from '$lib/events/reflection-status';
	import { resizeTextareaToContent } from '$lib/utils/resize-quiz-textarea';

	const protocolFields = ['reason', 'about', 'view', 'actions'] as const;
	type ProtocolField = (typeof protocolFields)[number];

	interface Props {
		isTop: boolean;
		visible: boolean;
		entry: EventEntry | null;
		source?: string;
		enableReflection?: boolean;
		onBack: () => void;
		onPersist: (entry: EventEntry) => Promise<void>;
	}

	let { isTop, visible, entry, source = 'archive', enableReflection = true, onBack, onPersist }: Props = $props();

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
	let saving = $state(false);
	let loadedSnapshot = $state<string | null>(null);
	let editingEvent = $state(false);
	let fieldFocused = $state<Record<ProtocolField, boolean>>({
		reason: false,
		about: false,
		view: false,
		actions: false
	});
	let resizeTrigger = $state(0);

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
	let eventInputResizeFrame: number | null = null;

	const hasChanges = $derived(
		draft.event.trim() !== baselineDraft.event.trim() ||
			draft.reason.trim() !== baselineDraft.reason.trim() ||
			draft.about.trim() !== baselineDraft.about.trim() ||
			draft.view.trim() !== baselineDraft.view.trim() ||
			draft.actions.trim() !== baselineDraft.actions.trim() ||
			reflectionScore !== baselineReflectionScore ||
			eventKind !== baselineEventKind
	);

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
		fieldFocused = { reason: false, about: false, view: false, actions: false };
	}

	$effect(() => {
		if (!isTop || !entry) return;

		const snapshot = entrySnapshot(entry);
		if (snapshot === loadedSnapshot) return;

		loadedSnapshot = snapshot;
		loadFromEntry(entry);
	});

	$effect(() => {
		if (isTop) return;
		loadedSnapshot = null;
		editingEvent = false;
		fieldFocused = { reason: false, about: false, view: false, actions: false };
	});

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

	function reflectionLabel(field: ProtocolField): string {
		return protocolFieldLabel(field, entry?.score ?? 0, (k) => i18n.t(k));
	}

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

	function resizeViewport(): void {
		queueMicrotask(() => {
			resizeTrigger += 1;
		});
	}

	function scrollEventInputIntoView(): void {
		eventInput?.closest('.report-header')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	async function focusEventInput(): Promise<void> {
		editingEvent = true;
		await tick();
		requestAnimationFrame(() => {
			eventInput?.focus({ preventScroll: true });
			queueEventInputResize();
			scrollEventInputIntoView();
		});
		void hapticLight();
	}

	function onEventBlur(): void {
		editingEvent = false;
	}

	function buildEntry(): EventEntry | null {
		if (!entry) return null;

		const protocol: ReflectionProtocol = { ...draft };
		if (!enableReflection || shouldSaveReflectionScore(entry, draft, reflectionScore)) {
			protocol.reflectionScore = reflectionScore;
		} else if (entry.protocol?.reflectionScore !== undefined) {
			protocol.reflectionScore = entry.protocol.reflectionScore;
		}

		return {
			...entry,
			text: draft.event.trim() || entry.text,
			kind: eventKind,
			protocol
		};
	}

	async function persist(closeAfter = false): Promise<void> {
		if (saving) return;

		if (!hasChanges) {
			if (closeAfter) onBack();
			return;
		}

		const updated = buildEntry();
		if (!updated) return;

		saving = true;
		try {
			await onPersist(updated);
			baselineDraft = { ...draft };
			baselineReflectionScore = reflectionScore;
			baselineEventKind = eventKind;
			track('reflection_report_saved', {
				source,
				enableReflection,
				status: getReflectionStatus(updated),
				score: reflectionScore,
				filledFields: protocolFilledCount(updated.protocol),
				closeAfter
			});
			void hapticLight();
			if (closeAfter) onBack();
		} finally {
			saving = false;
		}
	}

	async function backToArchive(): Promise<void> {
		if (hasChanges) {
			await persist(false);
		}
		onBack();
	}
</script>

{#snippet editIcon()}
	<AppIcon name="edit" class="inline-edit-icon" />
{/snippet}

{#snippet chrome()}
	<PanelChromeBar onBack={() => void backToArchive()}>
		{#snippet trailing()}
			{#if hasChanges}
				<ChromeRoundButton
					icon="check"
					label={i18n.t('analysis.saveReflection')}
					disabled={saving}
					onclick={() => void persist(true)}
				/>
			{/if}
		{/snippet}
	</PanelChromeBar>
{/snippet}

<PanelShell
	{isTop}
	{visible}
	labelledBy="reflection-report-title"
	keyboardAware
	onViewportChange={resizeViewport}
	{chrome}
>
	{#snippet children()}
		{#if entry}
			<article class="reflection-report">
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
							oninput={queueEventInputResize}
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

				{#if enableReflection}
					{#each protocolFields as field (field)}
						<section class="report-section" aria-labelledby="report-{field}">
							<h2 class="quiz-question" id="report-{field}">{reflectionLabel(field)}</h2>
							<QuizTextField
								bind:value={draft[field]}
								bind:focused={fieldFocused[field]}
								placeholder={i18n.t('analysis.writePlaceholder')}
								ariaLabel={reflectionLabel(field)}
								{resizeTrigger}
								{editIcon}
							/>
						</section>
					{/each}
				{/if}

				<section class="report-section report-section--score" aria-labelledby="report-resonance">
					<h2 class="quiz-question" id="report-resonance">{i18n.t('analysis.resonanceQuestion')}</h2>
					<EventKindSwitcher bind:value={eventKind} />
					<ScorePicker
						bind:value={reflectionScore}
						ariaLabel={i18n.t('analysis.resonanceQuestion')}
					/>
				</section>

			</article>
		{/if}
	{/snippet}
</PanelShell>

<style>
	.report-title-wrap {
		width: 100%;
		min-width: 0;
		margin-bottom: var(--space-4);
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

</style>
