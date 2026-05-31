<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import EventKindIcon from '$lib/components/EventKindIcon.svelte';
	import ReflectEntryCard from '$lib/components/ReflectEntryCard.svelte';
	import ScoreDots from '$lib/components/ScoreDots.svelte';
	import ScorePicker from '$lib/components/ScorePicker.svelte';
	import { AppIcon } from '$lib/icons';
	import {
		classifyDayEntries,
		emptyDayReflection,
		hasDayReflectionChanges,
		resolveDayScore
	} from '$lib/events/day-reflection';
	import { getReflectionStatus, type ReflectionStatus } from '$lib/events/reflection-status';
	import type { DayReflection, EventEntry, EventKind } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';
	import { resizeQuizTextarea } from '$lib/utils/resize-quiz-textarea';

	interface EntryPreset {
		kind: EventKind;
		score: number;
	}

	interface Props {
		open: boolean;
		dayKey: string;
		label?: string;
		entries?: EventEntry[];
		saved?: DayReflection | null;
		onClose: () => void;
		onPersist: (reflection: DayReflection) => Promise<void>;
		onAddEntry: (preset: EntryPreset) => void;
		onOpenEntry: (entry: EventEntry) => void;
	}

	let {
		open,
		dayKey,
		label = '',
		entries = [],
		saved = null,
		onClose,
		onPersist,
		onAddEntry,
		onOpenEntry
	}: Props = $props();

	const i18n = useI18n();

	const MIN_LINES = 2;
	const BUFFER_LINES = 1;

	let nextActions = $state('');
	let insights = $state('');
	let dayScore = $state(0);
	let baselineNextActions = $state('');
	let baselineInsights = $state('');
	let baselineScore = $state(0);
	let baselineNextActionsEdited = $state(false);
	let baselineInsightsEdited = $state(false);
	let baselineScoreEdited = $state(false);
	let nextActionsEdited = $state(false);
	let insightsEdited = $state(false);
	let scoreEdited = $state(false);
	let saving = $state(false);
	let loadedDayKey = $state<string | null>(null);

	let nextActionsFocused = $state(false);
	let insightsFocused = $state(false);
	let nextActionsInput = $state<HTMLTextAreaElement | null>(null);
	let insightsInput = $state<HTMLTextAreaElement | null>(null);
	let nextActionsWrap = $state<HTMLDivElement | null>(null);
	let insightsWrap = $state<HTMLDivElement | null>(null);

	const dayLabel = $derived(label.trim() || i18n.t('archive.title'));
	const classified = $derived(classifyDayEntries(entries));
	const hasChanges = $derived(
		hasDayReflectionChanges(
			{
				nextActions,
				insights,
				score: dayScore,
				nextActionsEdited,
				insightsEdited,
				scoreEdited
			},
			{
				nextActions: baselineNextActions,
				insights: baselineInsights,
				score: baselineScore,
				nextActionsEdited: baselineNextActionsEdited,
				insightsEdited: baselineInsightsEdited,
				scoreEdited: baselineScoreEdited
			}
		)
	);
	const canSave = $derived(hasChanges && !saving);
	const showNextActionsDisplay = $derived(!nextActionsFocused);
	const showInsightsDisplay = $derived(!insightsFocused);
	const showNextActionsPlaceholder = $derived(!nextActions.trim());
	const showInsightsPlaceholder = $derived(!insights.trim());

	const entryPresets = {
		positiveEvents: { kind: 'event', score: 1 },
		negativeEvents: { kind: 'event', score: -1 },
		positiveActs: { kind: 'act', score: 1 },
		negativeActs: { kind: 'act', score: -1 }
	} as const satisfies Record<string, EntryPreset>;

	$effect(() => {
		if (!open || !dayKey || dayKey === loadedDayKey) return;

		loadedDayKey = dayKey;
		const source = saved ?? emptyDayReflection(dayKey);
		const resolvedScore = resolveDayScore(saved, entries);
		nextActions = source.nextActions;
		insights = source.insights;
		dayScore = resolvedScore;
		baselineNextActions = source.nextActions;
		baselineInsights = source.insights;
		baselineScore = resolvedScore;
		nextActionsEdited = source.nextActionsEdited === true;
		insightsEdited = source.insightsEdited === true;
		scoreEdited = source.scoreEdited === true;
		baselineNextActionsEdited = nextActionsEdited;
		baselineInsightsEdited = insightsEdited;
		baselineScoreEdited = scoreEdited;
		nextActionsFocused = false;
		insightsFocused = false;
	});

	$effect(() => {
		if (open) return;
		loadedDayKey = null;
		nextActionsFocused = false;
		insightsFocused = false;
	});

	$effect(() => {
		if (!open) return;
		nextActions;
		showNextActionsDisplay;
		showNextActionsPlaceholder;
		nextActionsFocused;
		void tick().then(() => resizeField(nextActionsInput, nextActionsWrap));
	});

	$effect(() => {
		if (!open) return;
		insights;
		showInsightsDisplay;
		showInsightsPlaceholder;
		insightsFocused;
		void tick().then(() => resizeField(insightsInput, insightsWrap));
	});

	function resizeField(
		el: HTMLTextAreaElement | null,
		wrap: HTMLDivElement | null
	): void {
		if (!el || !wrap) return;

		resizeQuizTextarea(el, wrap, { minLines: MIN_LINES, bufferLines: BUFFER_LINES });
	}

	async function focusField(
		field: 'nextActions' | 'insights',
		options: { haptic?: boolean } = {}
	): Promise<void> {
		if (field === 'nextActions') {
			nextActionsFocused = true;
		} else {
			insightsFocused = true;
		}

		await tick();
		requestAnimationFrame(() => {
			const el = field === 'nextActions' ? nextActionsInput : insightsInput;
			const wrap = field === 'nextActions' ? nextActionsWrap : insightsWrap;
			el?.focus({ preventScroll: true });
			resizeField(el, wrap);
		});

		if (options.haptic !== false) {
			void hapticLight();
		}
	}

	function buildReflection(): DayReflection {
		const trimmedNextActions = nextActions.trim();
		const trimmedInsights = insights.trim();

		return {
			dayKey,
			nextActions: trimmedNextActions,
			insights: trimmedInsights,
			score: dayScore,
			nextActionsEdited:
				nextActionsEdited || trimmedNextActions !== baselineNextActions.trim(),
			insightsEdited: insightsEdited || trimmedInsights !== baselineInsights.trim(),
			scoreEdited,
			updatedAt: new Date().toISOString()
		};
	}

	async function persist(closeAfter = false): Promise<void> {
		if (!hasChanges || saving) return;

		const reflection = buildReflection();
		saving = true;
		try {
			await onPersist(reflection);
			baselineNextActions = reflection.nextActions;
			baselineInsights = reflection.insights;
			baselineScore = reflection.score ?? 0;
			nextActionsEdited = reflection.nextActionsEdited ?? false;
			insightsEdited = reflection.insightsEdited ?? false;
			scoreEdited = reflection.scoreEdited ?? false;
			baselineNextActionsEdited = nextActionsEdited;
			baselineInsightsEdited = insightsEdited;
			baselineScoreEdited = scoreEdited;
			track('day_reflection_saved', { day: dayKey });
			void hapticLight();
			if (closeAfter) onClose();
		} finally {
			saving = false;
		}
	}

	async function back(): Promise<void> {
		if (hasChanges) {
			await persist(false);
		}
		onClose();
	}

	function markNextActionsEdited(): void {
		nextActionsEdited = true;
	}

	function markInsightsEdited(): void {
		insightsEdited = true;
	}

	function markScoreEdited(): void {
		scoreEdited = true;
	}

	function onNextActionsBlur(): void {
		if (nextActions.trim() !== baselineNextActions.trim()) {
			nextActionsEdited = true;
		}
		nextActionsFocused = false;
	}

	function onInsightsBlur(): void {
		if (insights.trim() !== baselineInsights.trim()) {
			insightsEdited = true;
		}
		insightsFocused = false;
	}

	function addEntry(preset: EntryPreset): void {
		onAddEntry(preset);
		void hapticLight();
	}

	function reflectActionLabel(status: ReflectionStatus): string {
		const map: Record<ReflectionStatus, string> = {
			empty: i18n.t('archive.reflectEmpty'),
			partial: i18n.t('archive.reflectPartial'),
			complete: i18n.t('archive.reflectComplete')
		};
		return map[status];
	}

	function openEntry(entry: EventEntry): void {
		onOpenEntry(entry);
		void hapticLight();
	}
</script>

{#snippet editIcon()}
	<AppIcon name="edit" class="inline-edit-icon" />
{/snippet}

{#snippet header()}
	<div class="day-header">
		<button type="button" class="day-back" onclick={() => void back()}>
			{i18n.t('analysis.back')}
		</button>

		<h1 id="reflection-day-title" class="day-header__title">{dayLabel}</h1>
	</div>
{/snippet}

{#snippet sectionHead(titleId: string, title: string, preset: EntryPreset)}
	<div class="day-section__head">
		<div class="day-section__title-wrap">
			<span class="day-section__kind" aria-hidden="true">
				<EventKindIcon kind={preset.kind} />
			</span>
			<h2 class="quiz-question" id={titleId}>{title}</h2>
		</div>
		<button
			type="button"
			class="day-add"
			aria-label={i18n.t('dayReflection.addEntry')}
			onclick={() => addEntry(preset)}
		>
			<AppIcon name="add" />
		</button>
	</div>
{/snippet}

{#snippet entryList(items: EventEntry[])}
	{#if items.length === 0}
		<p class="day-empty">{i18n.t('dayReflection.emptySection')}</p>
	{:else}
		<ul class="day-list">
			{#each items as entry (entry.id)}
				{@const reflectStatus = getReflectionStatus(entry)}
				<li class="day-list__item">
					<ReflectEntryCard
						{entry}
						{reflectStatus}
						variant="compact"
						actionLabel={reflectActionLabel(reflectStatus)}
						onOpen={() => openEntry(entry)}
					/>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<AppFullscreen
	{open}
	labelledBy="reflection-day-title"
	showClose={false}
	onClose={() => void back()}
	{header}
>
	{#snippet children()}
		<article class="day-reflection">
			<section class="day-section day-section--entries" aria-labelledby="day-positive-events">
				{@render sectionHead(
					'day-positive-events',
					i18n.t('dayReflection.positiveEvents'),
					entryPresets.positiveEvents
				)}
				{@render entryList(classified.positiveEvents)}
			</section>

			<section class="day-section day-section--entries" aria-labelledby="day-negative-events">
				{@render sectionHead(
					'day-negative-events',
					i18n.t('dayReflection.negativeEvents'),
					entryPresets.negativeEvents
				)}
				{@render entryList(classified.negativeEvents)}
			</section>

			<section class="day-section day-section--entries" aria-labelledby="day-positive-acts">
				{@render sectionHead(
					'day-positive-acts',
					i18n.t('dayReflection.positiveActs'),
					entryPresets.positiveActs
				)}
				{@render entryList(classified.positiveActs)}
			</section>

			<section class="day-section day-section--entries" aria-labelledby="day-negative-acts">
				{@render sectionHead(
					'day-negative-acts',
					i18n.t('dayReflection.negativeActs'),
					entryPresets.negativeActs
				)}
				{@render entryList(classified.negativeActs)}
			</section>

			<section class="day-section" aria-labelledby="day-next-actions">
				<h2 class="quiz-question" id="day-next-actions">{i18n.t('dayReflection.nextActions')}</h2>
				<div class="quiz-input-wrap" bind:this={nextActionsWrap}>
					{#if showNextActionsDisplay}
						<button
							type="button"
							class="quiz-input-display"
							class:quiz-input-display--placeholder={showNextActionsPlaceholder}
							aria-label={i18n.t('analysis.edit')}
							onclick={() => void focusField('nextActions')}
						>
							{#if showNextActionsPlaceholder}
								{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
							{:else}
								{nextActions}{@render editIcon()}
							{/if}
						</button>
					{:else if showNextActionsPlaceholder}
						<div class="quiz-input-placeholder" aria-hidden="true">
							{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
						</div>
					{/if}
					<textarea
						bind:this={nextActionsInput}
						class="quiz-input"
						class:quiz-input--hidden={showNextActionsDisplay}
						bind:value={nextActions}
						rows="1"
						aria-label={i18n.t('dayReflection.nextActions')}
						onfocus={() => (nextActionsFocused = true)}
						onblur={onNextActionsBlur}
						oninput={() => {
							markNextActionsEdited();
							resizeField(nextActionsInput, nextActionsWrap);
						}}
					></textarea>
				</div>
			</section>

			<section class="day-section" aria-labelledby="day-insights">
				<h2 class="quiz-question" id="day-insights">{i18n.t('dayReflection.insights')}</h2>
				<div class="quiz-input-wrap" bind:this={insightsWrap}>
					{#if showInsightsDisplay}
						<button
							type="button"
							class="quiz-input-display"
							class:quiz-input-display--placeholder={showInsightsPlaceholder}
							aria-label={i18n.t('analysis.edit')}
							onclick={() => void focusField('insights')}
						>
							{#if showInsightsPlaceholder}
								{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
							{:else}
								{insights}{@render editIcon()}
							{/if}
						</button>
					{:else if showInsightsPlaceholder}
						<div class="quiz-input-placeholder" aria-hidden="true">
							{i18n.t('analysis.writePlaceholder')}{@render editIcon()}
						</div>
					{/if}
					<textarea
						bind:this={insightsInput}
						class="quiz-input"
						class:quiz-input--hidden={showInsightsDisplay}
						bind:value={insights}
						rows="1"
						aria-label={i18n.t('dayReflection.insights')}
						onfocus={() => (insightsFocused = true)}
						onblur={onInsightsBlur}
						oninput={() => {
							markInsightsEdited();
							resizeField(insightsInput, insightsWrap);
						}}
					></textarea>
				</div>
			</section>

			<section class="day-section day-section--score" aria-labelledby="day-score">
				<h2 class="quiz-question" id="day-score">{i18n.t('dayReflection.dayScore')}</h2>
				<ScorePicker
					bind:value={dayScore}
					ariaLabel={i18n.t('dayReflection.dayScore')}
					onUserChange={markScoreEdited}
				/>
			</section>

			<footer class="day-footer">
				<button
					type="button"
					class="day-save"
					disabled={!canSave}
					aria-label={i18n.t('dayReflection.save')}
					onclick={() => void persist(true)}
				>
					<AppIcon name="check" />
				</button>
			</footer>
		</article>
	{/snippet}
</AppFullscreen>

<style>
	.day-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
	}

	.day-back {
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

	.day-back:hover,
	.day-back:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.day-header__title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.day-reflection {
		display: grid;
		gap: var(--space-5);
		max-width: var(--content-max-width);
		margin: 0 auto;
		width: 100%;
		padding-bottom: var(--space-4);
	}

	.day-section--entries {
		padding-bottom: var(--space-7);
	}

	.day-section {
		display: grid;
		gap: var(--space-2);
	}

	.day-section--score :global(.score-picker-wrap) {
		margin-top: var(--space-1);
	}

	.day-section__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.day-section__title-wrap {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		flex: 1;
		min-width: 0;
	}

	.day-section__kind {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.375rem;
		height: 1.375rem;
		margin-top: 0.35em;
		color: var(--text-faint);
		font-size: 1.125rem;
	}

	.day-section__head .quiz-question {
		flex: 1;
		min-width: 0;
		margin-bottom: 0;
	}

	.quiz-question {
		margin: 0 0 var(--space-3);
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.day-add {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 1.875rem;
		height: 1.875rem;
		margin-top: 0.15em;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: color var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.day-add :global(svg.app-icon) {
		width: 1.375rem;
		height: 1.375rem;
	}

	.day-add:hover,
	.day-add:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.day-empty {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-faint);
	}

	.day-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.day-list__item {
		border: none;
	}

	.day-list__item:last-child :global(.reflect-entry) {
		border-bottom: none;
		padding-bottom: 0;
	}

	.day-list__item:first-child :global(.reflect-entry) {
		padding-top: 0;
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

	.day-footer {
		display: flex;
		justify-content: flex-end;
		padding-top: var(--space-2);
	}

	.day-save {
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

	.day-save :global(svg.app-icon) {
		width: var(--text-lg);
		height: var(--text-lg);
	}

	.day-save:hover:not(:disabled),
	.day-save:focus-visible:not(:disabled) {
		border-color: var(--accent-dim);
		color: var(--text);
		outline: none;
	}

	.day-save:disabled {
		opacity: 0.28;
		cursor: not-allowed;
	}
</style>
