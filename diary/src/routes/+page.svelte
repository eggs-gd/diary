<script lang="ts">
	import { onMount } from 'svelte';
	import CaptureEvent from '$lib/components/CaptureEvent.svelte';
	import EventReflection from '$lib/components/EventReflection.svelte';
	import ReflectionDay from '$lib/components/ReflectionDay.svelte';
	import ArchiveCalendar from '$lib/components/ArchiveCalendar.svelte';
	import ArchiveExport from '$lib/components/ArchiveExport.svelte';
	import ArchiveList from '$lib/components/ArchiveList.svelte';
	import { AppIcon } from '$lib/icons';
	import { entriesForDay, formatDayLabel, createdAtForDayKey } from '$lib/events/grouping';
	import type { EventKind } from '$lib/events/types';
	import { buildArchiveView } from '$lib/events/archive-view';
	import type { EventEntry } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { initShareIntent } from '$lib/platform/share-intent';
	import { useWeekStart } from '$lib/preferences/week-start.svelte';
	import { eventStore } from '$lib/state/events.svelte';
	import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
	import { track, trackVisible } from '$lib/analytics';

	const i18n = useI18n();
	const weekStart = useWeekStart();

	const archiveView = $derived(
		buildArchiveView(eventStore.entries, i18n.locale, dayReflectionStore.byDayKey)
	);

	let captureOpen = $state(false);
	let captureInitialText = $state('');
	let captureInitialKind = $state<EventKind | null>(null);
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


	function openCapture(
		text = '',
		options?: { dayKey?: string; kind?: EventKind; score?: number }
	): void {
		captureInitialText = text;
		captureInitialKind = options?.kind ?? null;
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

	let exportSettingsOpen = $state(false);

	function openExportSettings(): void {
		exportSettingsOpen = true;
		track('archive_export_settings_opened');
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
				{#if eventStore.entries.length > 0}
					<button
						type="button"
						class="archive-icon-btn"
						aria-label={i18n.t('archive.share')}
						onclick={openExportSettings}
					>
						<AppIcon name="share" />
					</button>
				{/if}
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
			<ArchiveList {archiveView} onOpenDay={openDayReflection} onOpenEntry={openAnalysis} />
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

<EventReflection bind:entry={selectedEntry} />

<ArchiveExport
	open={exportSettingsOpen}
	entries={eventStore.entries}
	dayReflections={dayReflectionStore.byDayKey}
	weekStart={weekStart.preference}
	onClose={() => (exportSettingsOpen = false)}
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

</style>
