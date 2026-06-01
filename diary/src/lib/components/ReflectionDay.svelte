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
	import { getReflectionStatus } from '$lib/events/reflection-status';
	import type { DayReflection, EventEntry, EventKind } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { track } from '$lib/analytics';
	import { reflectActionLabel } from '$lib/events/format';
	import QuizTextField from '$lib/components/QuizTextField.svelte';

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
		source?: string;
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
		source = 'archive',
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

	// Mark edited when focus leaves the field (blur detection via focused state)
	$effect(() => {
		if (!open) return;
		if (!nextActionsFocused) {
			// If we had focused and now lost focus, check if content changed
			if (nextActions.trim() !== baselineNextActions.trim()) {
				nextActionsEdited = true;
			}
		}
	});

	$effect(() => {
		if (!open) return;
		if (!insightsFocused) {
			if (insights.trim() !== baselineInsights.trim()) {
				insightsEdited = true;
			}
		}
	});


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
			track('day_reflection_saved', {
				day: dayKey,
				source,
				entries: entries.length,
				nextActionsEdited: reflection.nextActionsEdited === true,
				insightsEdited: reflection.insightsEdited === true,
				scoreEdited: reflection.scoreEdited === true,
				closeAfter
			});
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


	function addEntry(preset: EntryPreset, section: string): void {
		track('day_reflection_add_entry_clicked', {
			day: dayKey,
			source,
			section,
			kind: preset.kind,
			score: preset.score
		});
		onAddEntry(preset);
		void hapticLight();
	}


	function openEntry(entry: EventEntry): void {
		track('day_reflection_entry_opened', {
			day: dayKey,
			source,
			score: entry.score,
			kind: entry.kind
		});
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

{#snippet sectionHead(titleId: string, title: string, preset: EntryPreset, section: string)}
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
			onclick={() => addEntry(preset, section)}
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
						actionLabel={reflectActionLabel(reflectStatus, (k) => i18n.t(k))}
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
					entryPresets.positiveEvents,
					'positive_events'
				)}
				{@render entryList(classified.positiveEvents)}
			</section>

			<section class="day-section day-section--entries" aria-labelledby="day-negative-events">
				{@render sectionHead(
					'day-negative-events',
					i18n.t('dayReflection.negativeEvents'),
					entryPresets.negativeEvents,
					'negative_events'
				)}
				{@render entryList(classified.negativeEvents)}
			</section>

			<section class="day-section day-section--entries" aria-labelledby="day-positive-acts">
				{@render sectionHead(
					'day-positive-acts',
					i18n.t('dayReflection.positiveActs'),
					entryPresets.positiveActs,
					'positive_acts'
				)}
				{@render entryList(classified.positiveActs)}
			</section>

			<section class="day-section day-section--entries" aria-labelledby="day-negative-acts">
				{@render sectionHead(
					'day-negative-acts',
					i18n.t('dayReflection.negativeActs'),
					entryPresets.negativeActs,
					'negative_acts'
				)}
				{@render entryList(classified.negativeActs)}
			</section>

			<section class="day-section" aria-labelledby="day-next-actions">
				<h2 class="quiz-question" id="day-next-actions">{i18n.t('dayReflection.nextActions')}</h2>
				<QuizTextField
					bind:value={nextActions}
					bind:focused={nextActionsFocused}
					placeholder={i18n.t('analysis.writePlaceholder')}
					ariaLabel={i18n.t('dayReflection.nextActions')}
					{editIcon}
				/>
			</section>

			<section class="day-section" aria-labelledby="day-insights">
				<h2 class="quiz-question" id="day-insights">{i18n.t('dayReflection.insights')}</h2>
				<QuizTextField
					bind:value={insights}
					bind:focused={insightsFocused}
					placeholder={i18n.t('analysis.writePlaceholder')}
					ariaLabel={i18n.t('dayReflection.insights')}
					{editIcon}
				/>
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
