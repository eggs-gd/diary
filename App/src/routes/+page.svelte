<script lang="ts">
	import { onMount } from 'svelte';
	import ArchiveCalendarPanel from '$lib/components/ArchiveCalendarPanel.svelte';
	import CaptureEventPanel from '$lib/components/CaptureEventPanel.svelte';
	import ReflectionDayPanel from '$lib/components/ReflectionDayPanel.svelte';
	import ReflectionEventPanel from '$lib/components/ReflectionEventPanel.svelte';
	import ReflectionReportPanel from '$lib/components/ReflectionReportPanel.svelte';
	import ArchiveExport from '$lib/components/ArchiveExport.svelte';
	import ArchiveList from '$lib/components/ArchiveList.svelte';
	import PanelDeck from '$lib/components/navigation/PanelDeck.svelte';
	import PanelOverlay from '$lib/components/navigation/PanelOverlay.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import { AppButton } from '$lib/components/ui';
	import { createExampleEntry } from '$lib/events/example';
	import { analyticsConsent } from '$lib/state/analytics-consent.svelte';
	import { ChromeRoundButton } from '$lib/components/chrome';
	import '$lib/components/chrome/chrome-layout.css';
	import { entriesForDay, formatDayLabel, createdAtForDayKey } from '$lib/events/grouping';
	import type { EventKind } from '$lib/events/types';
	import { buildArchiveView } from '$lib/events/archive-view';
	import type { EventEntry } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { shareEventToIching } from '$lib/integrations/iching';
	import { hapticLight } from '$lib/platform/native';
	import { initShareIntent } from '$lib/platform/share-intent';
	import { useDayEnd, useReflectionEnabled } from '$lib/preferences';
	import { useWeekStart } from '$lib/preferences/week-start.svelte';
	import { eventStore } from '$lib/state/events.svelte';
	import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
	import { track, trackVisible } from '$lib/analytics';
	import {
		eventPanelForEntry,
		panelSourceFromContext,
		type CapturePreset
	} from '$lib/navigation/panel-stack';
	import { requestOverlayDismiss } from '$lib/navigation/overlay-dismiss';
	import { createPanelStack } from '$lib/navigation/panel-store.svelte';
	import { patchNavigationHost } from '$lib/navigation/navigation-host.svelte';
	import { getReflectionStatus, protocolFilledCount } from '$lib/events/reflection-status';

	const i18n = useI18n();
	const weekStart = useWeekStart();
	const dayEnd = useDayEnd();
	const reflection = useReflectionEnabled();
	const enableReflection = $derived(reflection.enabled);
	const stack = createPanelStack();

	const archiveView = $derived(
		buildArchiveView(eventStore.entries, i18n.locale, dayReflectionStore.byDayKey, dayEnd.hour)
	);

	let exportSettingsOpen = $state(false);

	const dayReflections = $derived(dayReflectionStore.reflections);

	const panelSource = $derived(panelSourceFromContext(stack.mainScreen, stack.overlays));

	function entryById(id: string): EventEntry | null {
		return eventStore.entries.find((item) => item.id === id) ?? null;
	}

	function reflectionSource(): 'archive' | 'day_reflection' {
		return panelSource === 'dayReflection' ? 'day_reflection' : 'archive';
	}

	onMount(() => {
		void eventStore.load();
		const teardownNav = patchNavigationHost({
			popPanel: () => stack.popOrNavigateBack()
		});

		let teardownShareIntent: (() => void) | null = null;
		void initShareIntent((text) => {
			openCapture(text, { source: 'share_sheet' });
			track('share_text_received');
		}).then((teardown) => {
			teardownShareIntent = teardown;
		});

		return () => {
			teardownNav();
			teardownShareIntent?.();
		};
	});

	$effect(() => {
		if (enableReflection && !dayReflectionStore.loaded) {
			void dayReflectionStore.load();
		}
	});

	function openCapture(
		text = '',
		options?: { dayKey?: string; kind?: EventKind; score?: number; source?: string }
	): void {
		const preset: CapturePreset = {
			initialText: text,
			initialKind: options?.kind ?? null,
			initialScore: options?.score ?? 0,
			initialCreatedAt: options?.dayKey ? createdAtForDayKey(options.dayKey) : undefined,
			focusKey: Date.now()
		};
		const source = options?.source ?? 'main';
		stack.pushOverlay({ type: 'capture', preset, source });
		track('capture_opened', {
			source,
			hasPrefill: text.trim().length > 0,
			presetKind: options?.kind ?? 'none',
			presetScore: options?.score ?? 0,
			day: options?.dayKey ?? 'none',
			stack_depth: stack.depth
		});
		void hapticLight();
	}

	function closeCapture(source: string): void {
		track('capture_closed', { source, stack_depth: stack.depth });
		requestOverlayDismiss() || stack.popOverlay();
	}

	async function handleCaptureSave(entry: EventEntry): Promise<void> {
		await eventStore.add(entry);
		analyticsConsent.offer();
	}

	async function addExample(): Promise<void> {
		const entry = createExampleEntry(i18n.locale);
		await eventStore.add(entry);
		track('example_added');
		// The reflection questions are hidden in events mode (the default), so the example turns the
		// reflection mode on; it can be switched back in the profile.
		reflection.setEnabled(true);
		openAnalysis(entry);
	}

	function openAnalysis(entry: EventEntry): void {
		const panel = eventPanelForEntry(entry, enableReflection);
		stack.pushOverlay(panel);
		const source = reflectionSource();
		track('analysis_opened', {
			source,
			score: entry.score,
			stack_depth: stack.depth
		});
		track('reflection_opened', {
			source,
			mode: panel.type === 'eventWizard' ? 'wizard' : 'report',
			status: getReflectionStatus(entry),
			score: entry.score,
			filledFields: protocolFilledCount(entry.protocol),
			enableReflection
		});
		void hapticLight();
	}

	function shareEntryToIChing(entry: EventEntry): void {
		// Forwards the event text into the I Ching PWA via the CORE-144 `?q`
		// deeplink contract. Read-only: never mutates or persists the entry.
		const shared = shareEventToIching(entry.text);
		track('event_shared_to_iching', {
			shared,
			textLength: entry.text.trim().length
		});
		void hapticLight();
	}

	function openCalendar(resetView = true): void {
		stack.openCalendar(resetView);
		track('calendar_opened', { stack_depth: stack.depth });
	}

	function openExportSettings(): void {
		exportSettingsOpen = true;
		track('archive_export_settings_opened');
		void hapticLight();
	}

	function openDayReflection(dayKey: string): void {
		stack.pushOverlay({ type: 'dayReflection', dayKey });
		track('day_reflection_opened', {
			day: dayKey,
			count: entriesForDay(eventStore.entries, dayKey, dayEnd.hour).length,
			from: panelSource,
			stack_depth: stack.depth
		});
		void hapticLight();
	}

	function closeDayReflection(dayKey: string): void {
		track('day_reflection_closed', {
			day: dayKey,
			source: panelSource,
			stack_depth: stack.depth
		});
		requestOverlayDismiss() || stack.popOverlay();
	}

	async function persistEntry(updated: EventEntry): Promise<void> {
		await eventStore.update(updated);
	}

	async function completeWizard(updated: EventEntry): Promise<void> {
		await persistEntry(updated);
		const source = reflectionSource();
		const status = getReflectionStatus(updated);

		track('reflection_quiz_saved', {
			source,
			status,
			score: updated.protocol?.reflectionScore ?? updated.score,
			filledFields: protocolFilledCount(updated.protocol),
			complete: status === 'complete'
		});
		void hapticLight();
		stack.replaceTopOverlay({ type: 'eventReport', entryId: updated.id });
		track('reflection_opened', {
			source,
			mode: 'report',
			status: getReflectionStatus(updated),
			score: updated.score,
			filledFields: protocolFilledCount(updated.protocol),
			enableReflection
		});
	}

	function closeReflection(entry: EventEntry | null, mode: 'wizard' | 'report'): void {
		if (entry) {
			track('reflection_closed', {
				source: reflectionSource(),
				mode,
				status: getReflectionStatus(entry),
				filledFields: protocolFilledCount(entry.protocol),
				enableReflection
			});
		}
		requestOverlayDismiss() || stack.popOverlay();
	}
</script>

{#if stack.onJournal}
	<div class="chrome-float-start chrome-float-start--viewport">
		<ProfileMenu />
	</div>

	<div class="chrome-float-end chrome-float-end--viewport">
		<div class="chrome-actions">
			{#if enableReflection && eventStore.entries.length > 0}
				<ChromeRoundButton
					icon="share"
					label={i18n.t('archive.share')}
					onclick={openExportSettings}
				/>
			{/if}
			<ChromeRoundButton
				icon="calendar"
				label={i18n.t('archive.openCalendar')}
				onclick={() => openCalendar(true)}
			/>
		</div>
	</div>

	<div class="archive-fab">
		<ChromeRoundButton
			icon="add"
			label={i18n.t('capture.newEvent')}
			onclick={() => openCapture()}
		/>
	</div>
{/if}

<PanelDeck
	mainScreen={stack.mainScreen}
	overlayOpen={stack.hasOverlay}
	onJournal={stack.onJournal}
	canPopMain={stack.canPopMain}
	onPopMain={() => stack.openJournal()}
	onPushCalendar={() => openCalendar(true)}
>
	{#snippet journal({ isTop, visible })}
		<main class="main journal-panel">
			<section class="archive" use:trackVisible={{ event: 'archive_viewed' }}>
				{#if eventStore.entries.length === 0}
					{#if eventStore.loaded}
						<div class="empty">
							<p>{i18n.t('archive.emptyIntro')}</p>
							<div class="empty-actions">
								<AppButton variant="primary" onclick={() => openCapture()}>
									{i18n.t('archive.emptyAdd')}
								</AppButton>
								<AppButton variant="secondary" onclick={() => void addExample()}>
									{i18n.t('archive.emptyExample')}
								</AppButton>
							</div>
						</div>
					{/if}
				{:else}
					<ArchiveList
						{archiveView}
						{enableReflection}
						onOpenDay={(dayKey) => openDayReflection(dayKey)}
						onOpenEntry={(entry) => openAnalysis(entry)}
						onShareEntry={(entry) => shareEntryToIChing(entry)}
					/>
				{/if}
			</section>
		</main>
	{/snippet}

	{#snippet calendar({ isTop, visible })}
		<ArchiveCalendarPanel
			{isTop}
			{visible}
			entries={eventStore.entries}
			dayReflections={enableReflection ? dayReflections : []}
			{enableReflection}
			dayEndHour={dayEnd.hour}
			takeResetView={() => stack.takeCalendarResetView()}
			onBack={() => stack.openJournal()}
			onSelectDay={(dayKey) => openDayReflection(dayKey)}
		/>
	{/snippet}
</PanelDeck>

<PanelOverlay overlays={stack.overlays} onPop={() => stack.popOverlay()}>
	{#snippet panel({ panel, index, isTop, visible })}
		{#if panel.type === 'dayReflection'}
			{@const dayEntries = entriesForDay(eventStore.entries, panel.dayKey, dayEnd.hour)}
			<ReflectionDayPanel
				{isTop}
				{visible}
				dayKey={panel.dayKey}
				label={formatDayLabel(panel.dayKey, i18n.locale)}
				entries={dayEntries}
				saved={dayReflectionStore.get(panel.dayKey) ?? null}
				source={panelSource}
				{enableReflection}
				onBack={() => closeDayReflection(panel.dayKey)}
				onPersist={async (reflection) => {
					await dayReflectionStore.save(reflection);
				}}
				onAddEntry={(preset) => {
					openCapture('', {
						dayKey: panel.dayKey,
						kind: preset.kind,
						score: preset.score,
						source: 'day_reflection'
					});
				}}
				onOpenEntry={(entry) => openAnalysis(entry)}
			/>
		{:else if panel.type === 'eventWizard'}
			{@const entry = entryById(panel.entryId)}
			{#if entry}
				<ReflectionEventPanel
					{isTop}
					{visible}
					{entry}
					onBack={() => closeReflection(entry, 'wizard')}
					onPersist={persistEntry}
					onComplete={completeWizard}
				/>
			{/if}
		{:else if panel.type === 'eventReport'}
			{@const entry = entryById(panel.entryId)}
			{#if entry}
				<ReflectionReportPanel
					{isTop}
					{visible}
					{entry}
					source={reflectionSource()}
					{enableReflection}
					onBack={() => closeReflection(entry, 'report')}
					onPersist={persistEntry}
				/>
			{/if}
		{:else if panel.type === 'capture'}
			<CaptureEventPanel
				{isTop}
				{visible}
				initialText={panel.preset.initialText ?? ''}
				initialKind={panel.preset.initialKind ?? null}
				initialScore={panel.preset.initialScore ?? 0}
				initialCreatedAt={panel.preset.initialCreatedAt}
				source={panel.source}
				focusKey={panel.preset.focusKey ?? 0}
				onBack={() => closeCapture(panel.source)}
				onSave={handleCaptureSave}
			/>
		{/if}
	{/snippet}
</PanelOverlay>

{#if enableReflection}
	<ArchiveExport
		open={exportSettingsOpen}
		entries={eventStore.entries}
		dayReflections={dayReflectionStore.byDayKey}
		weekStart={weekStart.preference}
		dayEndHour={dayEnd.hour}
		onClose={() => (exportSettingsOpen = false)}
	/>
{/if}

<style>
	.main {
		width: 100%;
		height: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		overflow-x: hidden;
		padding: calc(var(--space-6) + env(safe-area-inset-top, 0px))
			calc(var(--space-5) + env(safe-area-inset-right, 0px))
			calc(6.5rem + env(safe-area-inset-bottom, 0px))
			calc(var(--space-5) + env(safe-area-inset-left, 0px));
	}

	.journal-panel {
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		touch-action: pan-y;
	}

	.archive {
		margin-bottom: var(--space-7);
	}

	.archive-fab {
		position: fixed;
		right: calc(var(--space-4) + env(safe-area-inset-right, 0px));
		bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
		z-index: var(--z-chrome);
		pointer-events: auto;
	}

	.empty {
		margin-top: var(--space-4);
		padding: var(--space-5) 0;
		color: var(--text-muted);
	}

	.empty p {
		margin: 0 0 var(--space-4);
	}

	.empty-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
