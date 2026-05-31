<script lang="ts">
	import { onMount } from 'svelte';
	import CaptureEvent from '$lib/components/CaptureEvent.svelte';
	import ReflectionEvent from '$lib/components/ReflectionEvent.svelte';
	import ReflectionReport from '$lib/components/ReflectionReport.svelte';
	import ReflectionDay from '$lib/components/ReflectionDay.svelte';
	import ArchiveCalendar from '$lib/components/ArchiveCalendar.svelte';
	import ReflectEntryCard from '$lib/components/ReflectEntryCard.svelte';
	import ReflectStatusIcon from '$lib/components/ReflectStatusIcon.svelte';
	import ScoreDots from '$lib/components/ScoreDots.svelte';
	import { AppIcon } from '$lib/icons';
	import { entriesForDay, formatDayLabel, groupEventEntries, createdAtForDayKey } from '$lib/events/grouping';
	import {
		flattenMonthEntries,
		flattenYearEntries,
		medianEventScore
	} from '$lib/events/period-score';
	import { DEFAULT_EVENT_KIND, normalizeEventKind, type EventKind } from '$lib/events/types';
	import { getReflectionStatus, type ReflectionStatus } from '$lib/events/reflection-status';
	import { dayReflectionDisplayIcon } from '$lib/events/reflection-display';
	import {
		getDayReflectionCalendarState,
		type DayReflectionCalendarState
	} from '$lib/events/day-reflection';
	import type { EventEntry } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { useReflectionTone } from '$lib/preferences/reflection-tone.svelte';
	import { hapticLight } from '$lib/platform/native';
	import { initShareIntent } from '$lib/platform/share-intent';
	import { eventStore } from '$lib/state/events.svelte';
	import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
	import { track, trackVisible } from '$lib/analytics';

	const i18n = useI18n();
	const reflectionTone = useReflectionTone();

	const groupedEntries = $derived(groupEventEntries(eventStore.entries, i18n.locale));

	let captureOpen = $state(false);
	let captureInitialText = $state('');
	let captureInitialKind = $state<EventKind>(DEFAULT_EVENT_KIND);
	let captureInitialScore = $state(0);
	let captureCreatedAt = $state<string | undefined>(undefined);
	let captureFocusKey = $state(0);
	let selectedEntry = $state<EventEntry | null>(null);
	let calendarOpen = $state(false);
	let calendarResetView = $state(true);
	let reflectionDayOpen = $state(false);
	let reflectionDayKey = $state('');
	let reflectionDayLabel = $state('');
	let reflectionDayReturnTo = $state<'archive' | 'calendar'>('archive');

	const reflectionDayEntries = $derived(
		reflectionDayOpen && reflectionDayKey
			? entriesForDay(eventStore.entries, reflectionDayKey)
			: []
	);

	const dayReflections = $derived(dayReflectionStore.reflections);

	const reflectionReportOpen = $derived(
		selectedEntry !== null && getReflectionStatus(selectedEntry) === 'complete'
	);
	const reflectionWizardOpen = $derived(
		selectedEntry !== null && getReflectionStatus(selectedEntry) !== 'complete'
	);

	onMount(() => {
		void eventStore.load();
		void dayReflectionStore.load();
		let teardownShareIntent: (() => void) | null = null;
		void initShareIntent((text) => {
			openCapture(text);
			track('share_text_received');
		}).then((teardown) => {
			teardownShareIntent = teardown;
		});
		return () => teardownShareIntent?.();
	});

	function reflectActionLabel(status: ReflectionStatus): string {
		const map: Record<ReflectionStatus, string> = {
			empty: i18n.t('archive.reflectEmpty'),
			partial: i18n.t('archive.reflectPartial'),
			complete: i18n.t('archive.reflectComplete')
		};
		return map[status];
	}

	function dayReflectionActionLabel(dayKey: string, state: DayReflectionCalendarState): string {
		const dayLabel = formatDayLabel(dayKey, i18n.locale);
		const count = entriesForDay(eventStore.entries, dayKey).length;
		const map: Record<DayReflectionCalendarState, string> = {
			not_started: i18n.t('archive.dayReflectionNotStarted', { day: dayLabel, count }),
			partial: i18n.t('archive.dayReflectionPartial', { day: dayLabel, count }),
			complete: i18n.t('archive.dayReflectionComplete', { day: dayLabel, count })
		};
		return map[state];
	}

	function eventKindLabel(kind: EventKind): string {
		return kind === 'act' ? i18n.t('capture.kindAct') : i18n.t('capture.kindEvent');
	}

	function openCapture(
		text = '',
		options?: { dayKey?: string; kind?: EventKind; score?: number }
	): void {
		captureInitialText = text;
		captureInitialKind = options?.kind ?? DEFAULT_EVENT_KIND;
		captureInitialScore = options?.score ?? 0;
		captureCreatedAt = options?.dayKey ? createdAtForDayKey(options.dayKey) : undefined;
		captureFocusKey += 1;
		captureOpen = true;
		track('capture_opened');
		void hapticLight();
	}

	async function handleCaptureSave(entry: EventEntry): Promise<void> {
		await eventStore.add(entry);
	}

	function openAnalysis(entry: EventEntry): void {
		selectedEntry = entry;
		track('analysis_opened', { score: entry.score });
		void hapticLight();
	}

	function openCalendar(): void {
		calendarResetView = true;
		calendarOpen = true;
		track('calendar_opened');
		void hapticLight();
	}

	function openDayReflection(dayKey: string, returnTo: 'archive' | 'calendar' = 'archive'): void {
		reflectionDayReturnTo = returnTo;
		calendarResetView = false;
		calendarOpen = false;
		reflectionDayKey = dayKey;
		reflectionDayLabel = formatDayLabel(dayKey, i18n.locale);
		reflectionDayOpen = true;
		track('day_reflection_opened', {
			day: dayKey,
			count: entriesForDay(eventStore.entries, dayKey).length,
			from: returnTo
		});
		void hapticLight();
	}
</script>

<main class="main">
	<header class="site-header" use:trackVisible={{ event: 'home_header_viewed' }}>
		<h1 class="logo">觀明</h1>
	</header>

	<section class="archive" use:trackVisible={{ event: 'archive_viewed' }}>
		<div class="archive-head">
			<h2 class="archive-title">{i18n.t('archive.title')}</h2>
			<div class="archive-actions">
				<button
					type="button"
					class="archive-icon-btn"
					aria-label={i18n.t('capture.newEvent')}
					onclick={() => openCapture()}
				>
					<AppIcon name="add" />
				</button>
				<button
					type="button"
					class="archive-icon-btn"
					aria-label={i18n.t('archive.openCalendar')}
					onclick={openCalendar}
				>
					<AppIcon name="calendar" />
				</button>
			</div>
		</div>

		{#if eventStore.entries.length === 0}
			<p class="empty">{i18n.t('archive.empty')}</p>
		{:else}
			<div class="entries-grouped">
				{#each groupedEntries as year (year.key)}
					{@const yearEntries = flattenYearEntries(year)}
					{@const yearScore = medianEventScore(yearEntries)}
					<section class="group-year" aria-labelledby="journal-year-{year.key}">
						<div class="group-year-head">
							<h3 class="group-year-label" id="journal-year-{year.key}">{year.label}</h3>
							{#if yearScore !== null}
								<ScoreDots compact original={yearScore} />
							{/if}
						</div>
						{#each year.months as month (month.key)}
							{@const monthEntries = flattenMonthEntries(month)}
							{@const monthScore = medianEventScore(monthEntries)}
							<section class="group-month" aria-labelledby="journal-month-{month.key}">
								<div class="group-month-head">
									<h4 class="group-month-label" id="journal-month-{month.key}">{month.label}</h4>
									{#if monthScore !== null}
										<ScoreDots compact original={monthScore} />
									{/if}
								</div>
								{#each month.days as day (day.key)}
									{@const dayScore = medianEventScore(day.entries)}
									{@const dayReflectionState = getDayReflectionCalendarState(
										dayReflectionStore.get(day.key)
									)}
									{@const dayDisplayIcon = dayReflectionDisplayIcon(
										reflectionTone.preference,
										dayReflectionState
									)}
									<section class="group-day" aria-labelledby="journal-day-{day.key}">
										<button
											type="button"
											class="day-head-card"
											aria-label={dayReflectionActionLabel(day.key, dayReflectionState)}
											onclick={() => openDayReflection(day.key)}
										>
											<h5 class="group-day-label" id="journal-day-{day.key}">{day.label}</h5>
											<div class="group-day-actions">
												{#if dayScore !== null}
													<ScoreDots compact original={dayScore} />
												{/if}
												{#if dayDisplayIcon}
													<ReflectStatusIcon name={dayDisplayIcon} />
												{/if}
											</div>
										</button>
										<ul class="entries">
											{#each day.entries as entry (entry.id)}
												{@const reflectStatus = getReflectionStatus(entry)}
												<li>
													<ReflectEntryCard
														{entry}
														{reflectStatus}
														actionLabel={reflectActionLabel(reflectStatus)}
														kindLabel={eventKindLabel(normalizeEventKind(entry.kind))}
														timeLabel={new Date(entry.createdAt).toLocaleTimeString(
															i18n.locale === 'uk' ? 'uk-UA' : 'en-US',
															{ hour: '2-digit', minute: '2-digit' }
														)}
														onOpen={() => openAnalysis(entry)}
													/>
												</li>
											{/each}
										</ul>
									</section>
								{/each}
							</section>
						{/each}
					</section>
				{/each}
			</div>
		{/if}
	</section>
</main>

<CaptureEvent
	open={captureOpen}
	initialText={captureInitialText}
	initialKind={captureInitialKind}
	initialScore={captureInitialScore}
	initialCreatedAt={captureCreatedAt}
	focusKey={captureFocusKey}
	onClose={() => (captureOpen = false)}
	onSave={handleCaptureSave}
/>

<ArchiveCalendar
	open={calendarOpen}
	entries={eventStore.entries}
	dayReflections={dayReflections}
	resetView={calendarResetView}
	onClose={() => (calendarOpen = false)}
	onSelectDay={(dayKey) => openDayReflection(dayKey, 'calendar')}
/>

<ReflectionDay
	open={reflectionDayOpen}
	dayKey={reflectionDayKey}
	label={reflectionDayLabel}
	entries={reflectionDayEntries}
	saved={dayReflectionStore.get(reflectionDayKey) ?? null}
	onClose={() => {
		reflectionDayOpen = false;
		if (reflectionDayReturnTo === 'calendar') {
			calendarResetView = false;
			calendarOpen = true;
		}
	}}
	onPersist={async (reflection) => {
		await dayReflectionStore.save(reflection);
	}}
	onAddEntry={(preset) => {
		openCapture('', {
			dayKey: reflectionDayKey,
			kind: preset.kind,
			score: preset.score
		});
	}}
	onOpenEntry={openAnalysis}
/>

<ReflectionEvent
	open={reflectionWizardOpen}
	entry={selectedEntry}
	onClose={() => (selectedEntry = null)}
	onPersist={async (updated) => {
		await eventStore.update(updated);
		selectedEntry = updated;
	}}
	onComplete={async (updated) => {
		await eventStore.update(updated);
		track('reflection_saved', {
			score: updated.protocol?.reflectionScore ?? updated.score
		});
		void hapticLight();
		selectedEntry = updated;
	}}
/>

<ReflectionReport
	open={reflectionReportOpen}
	entry={selectedEntry}
	onClose={() => (selectedEntry = null)}
	onPersist={async (updated) => {
		await eventStore.update(updated);
		selectedEntry = updated;
	}}
/>

<style>
	.main {
		width: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		overflow-x: hidden;
		padding: calc(var(--space-7) + env(safe-area-inset-top, 0px))
			calc(var(--space-5) + env(safe-area-inset-right, 0px))
			calc(var(--space-6) + env(safe-area-inset-bottom, 0px))
			calc(var(--space-5) + env(safe-area-inset-left, 0px));
	}

	.site-header {
		text-align: center;
		margin-bottom: var(--space-5);
	}

	.logo {
		font-size: var(--text-hero);
		color: var(--accent);
		letter-spacing: var(--tracking-hero);
	}

	.archive {
		margin-bottom: var(--space-7);
	}

	.archive-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.archive-title {
		margin: 0;
		font-size: var(--text-xl);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: var(--text-muted);
	}

	.archive-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.archive-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.875rem;
		height: 1.875rem;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: color var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.archive-icon-btn :global(svg.app-icon) {
		width: 1.375rem;
		height: 1.375rem;
	}

	.archive-icon-btn:hover,
	.archive-icon-btn:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.empty {
		margin-top: var(--space-4);
		padding: var(--space-5) 0;
		color: var(--text-muted);
	}

	.entries-grouped {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		margin-top: var(--space-5);
	}

	.group-year,
	.group-month,
	.group-day {
		margin: 0;
	}

	.group-year-label,
	.group-month-label,
	.group-day-label {
		margin: 0;
		font-weight: 400;
	}

	.group-year-head,
	.group-month-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-width: 0;
	}

	.group-year-label {
		flex: 1;
		min-width: 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		color: var(--text-muted);
		letter-spacing: var(--tracking-caps);
		margin-bottom: var(--space-4);
	}

	.group-year-head {
		margin-bottom: var(--space-4);
	}

	.group-month-head {
		margin-bottom: var(--space-3);
	}

	.group-month {
		margin-bottom: var(--space-5);
	}

	.group-month:last-child {
		margin-bottom: 0;
	}

	.group-month-label {
		flex: 1;
		min-width: 0;
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: var(--text-faint);
		margin-bottom: var(--space-3);
	}

	.group-year-head .group-year-label {
		margin-bottom: 0;
	}

	.group-month-head .group-month-label {
		margin-bottom: 0;
	}

	.group-day {
		margin-bottom: var(--space-4);
	}

	.group-day:last-child {
		margin-bottom: 0;
	}

	.group-day-label {
		flex: 1;
		min-width: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		color: var(--text-muted);
		margin-bottom: var(--space-1);
	}

	.day-head-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		min-width: 0;
		margin: 0 0 var(--space-1);
		padding: var(--space-1) 0;
		border: none;
		border-radius: 0;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.day-head-card:hover,
	.day-head-card:focus-visible {
		background: var(--fill-subtle);
		outline: none;
	}

	.day-head-card .group-day-label {
		margin-bottom: 0;
	}

	.group-day-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.entries {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.entries li {
		border: none;
	}

	.entries li:last-child :global(.reflect-entry) {
		border-bottom: none;
	}

	@media (max-width: 24rem) {
		.entries :global(.reflect-entry__head) {
			flex-wrap: wrap;
		}
	}
</style>
