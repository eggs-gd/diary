<script lang="ts">
	import { untrack } from 'svelte';
	import { shareText, writeClipboardText } from '@eggs/kit/native';
	import { AppButton, AppFullscreen, AppPopup } from '$lib/components/ui';
	import { groupEventEntries } from '$lib/events/grouping';
	import {
		archiveFilename,
		buildAgentPrompt,
		buildArchiveMarkdown,
		exportBounds,
		filterEntriesByRange,
		type ExportMode,
		type ExportRange
	} from '$lib/events/export';
	import { localDateKeyFromDate } from '$lib/events/grouping';
	import type { DayReflection, EventEntry, Locale } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { resolveWeekStart } from '$lib/preferences/week-start';
	import type { DayEndHour } from '$lib/preferences/day-end';
	import type { WeekStartPreference } from '$lib/preferences/week-start';
	import { track } from '$lib/analytics';
	import { hapticLight } from '$lib/platform/native';

	interface Props {
		open: boolean;
		entries: EventEntry[];
		dayReflections: Map<string, DayReflection>;
		weekStart: WeekStartPreference;
		dayEndHour?: DayEndHour;
		onClose: () => void;
	}

	let { open, entries, dayReflections, weekStart, dayEndHour = 0, onClose }: Props = $props();

	const i18n = useI18n();

	let previewOpen = $state(false);
	let previewText = $state('');
	let previewFilename = $state('');
	let copied = $state(false);
	let range = $state<ExportRange>('today');
	let mode = $state<ExportMode>('report');

	const todayKey = $derived(localDateKeyFromDate(new Date(), dayEndHour));
	let customStart = $state('');
	let customEnd = $state('');

	/** The date-field values a preset resolves to (end clamped to today). */
	function presetKeys(value: ExportRange): { start: string; end: string } {
		const bounds = exportBounds(value, resolveWeekStart(weekStart, i18n.locale), dayEndHour);
		const lastDay = new Date(bounds.end.getTime() - 1);
		const start = localDateKeyFromDate(bounds.start, dayEndHour);
		let end = localDateKeyFromDate(lastDay, dayEndHour);
		if (end > todayKey) end = todayKey;
		return { start, end };
	}

	function selectPreset(value: ExportRange): void {
		range = value;
		const keys = presetKeys(value);
		customStart = keys.start;
		customEnd = keys.end;
	}

	function pickCustom(which: 'start' | 'end', value: string): void {
		if (which === 'start') customStart = value;
		else customEnd = value;
		range = 'custom';
	}

	// Reset to a sane default whenever the popup is reopened.
	$effect(() => {
		if (open) untrack(() => selectPreset('today'));
	});

	const selectedEntries = $derived(
		filterEntriesByRange(entries, range, resolveWeekStart(weekStart, i18n.locale), dayEndHour, {
			start: customStart,
			end: customEnd
		})
	);

	const rangeOptions: { value: ExportRange; labelKey: string }[] = [
		{ value: 'today', labelKey: 'archive.exportToday' },
		{ value: 'week', labelKey: 'archive.exportWeek' },
		{ value: 'month', labelKey: 'archive.exportMonth' }
	];

	const modeOptions: { value: ExportMode; labelKey: string }[] = [
		{ value: 'report', labelKey: 'archive.exportModeReport' },
		{ value: 'agent', labelKey: 'archive.exportModeAgent' }
	];

	function closeSettings(): void {
		onClose();
		copied = false;
	}

	async function exportArchive(): Promise<void> {
		if (!selectedEntries.length) return;

		const md = buildArchiveMarkdown(
			groupEventEntries(selectedEntries, i18n.locale, dayEndHour),
			dayReflections,
			(k, p) => i18n.t(k, p),
			i18n.locale as Locale
		);
		const payload = mode === 'agent' ? buildAgentPrompt(md, i18n.locale) : md;
		const filename = archiveFilename();

		track('archive_exported', {
			entries: selectedEntries.length,
			range,
			mode
		});
		void hapticLight();
		onClose();

		if (await shareText({ title: filename, text: payload })) return;

		previewText = payload;
		previewFilename = filename;
		previewOpen = true;
		copied = false;
	}

	function download(): void {
		const blob = new Blob([previewText], { type: 'text/plain; charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = previewFilename;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			URL.revokeObjectURL(url);
			a.remove();
		}, 2000);
	}

	async function copy(): Promise<void> {
		try {
			await writeClipboardText(previewText);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {}
	}
</script>

<AppPopup
	{open}
	size="wide"
	title={i18n.t('archive.exportSettingsTitle')}
	titleId="archive-export-settings-title"
	onClose={closeSettings}
>
	{#snippet children()}
		<div class="export-settings">
			<section class="export-setting-group" aria-labelledby="archive-export-range-title">
				<h4 id="archive-export-range-title" class="export-setting-title">
					{i18n.t('archive.exportRange')}
				</h4>
				<div class="export-segmented">
					{#each rangeOptions as option}
						<button
							type="button"
							class="export-segment"
							class:active={range === option.value}
							aria-pressed={range === option.value}
							onclick={() => selectPreset(option.value)}
						>
							{i18n.t(option.labelKey)}
						</button>
					{/each}
				</div>

				<div class="export-custom">
					<label class="export-custom__field">
						<span>{i18n.t('archive.exportFrom')}</span>
						<input
							type="date"
							max={customEnd}
							value={customStart}
							oninput={(e) => pickCustom('start', e.currentTarget.value)}
						/>
					</label>
					<label class="export-custom__field">
						<span>{i18n.t('archive.exportTo')}</span>
						<input
							type="date"
							min={customStart}
							max={todayKey}
							value={customEnd}
							oninput={(e) => pickCustom('end', e.currentTarget.value)}
						/>
					</label>
				</div>
			</section>

			<section class="export-setting-group" aria-labelledby="archive-export-mode-title">
				<h4 id="archive-export-mode-title" class="export-setting-title">
					{i18n.t('archive.exportMode')}
				</h4>
				<div class="export-segmented two">
					{#each modeOptions as option}
						<button
							type="button"
							class="export-segment"
							class:active={mode === option.value}
							aria-pressed={mode === option.value}
							onclick={() => (mode = option.value)}
						>
							{i18n.t(option.labelKey)}
						</button>
					{/each}
				</div>
			</section>

			<p class="export-count">
				{i18n.t('archive.exportSelectedCount', { count: selectedEntries.length })}
			</p>
		</div>
	{/snippet}

	{#snippet footer()}
		<AppButton
			variant="primary"
			disabled={selectedEntries.length === 0}
			onclick={() => void exportArchive()}
		>
			{i18n.t('archive.exportContinue')}
		</AppButton>
	{/snippet}
</AppPopup>

<AppFullscreen
	open={previewOpen}
	title={previewFilename || i18n.t('archive.share')}
	titleId="archive-export-title"
	onClose={() => (previewOpen = false)}
>
	{#snippet children()}
		<div class="export-preview">
			<div class="export-actions">
				<AppButton variant="secondary" onclick={download}>
					{i18n.t('archive.download')}
				</AppButton>
				<AppButton variant="secondary" onclick={() => void copy()}>
					{copied ? i18n.t('archive.copied') : i18n.t('archive.copy')}
				</AppButton>
			</div>
			<pre class="export-text">{previewText}</pre>
		</div>
	{/snippet}
</AppFullscreen>

<style>
	.export-settings {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.export-setting-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.export-setting-title {
		margin: 0;
		color: var(--text-faint);
		font-size: var(--text-xs);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.export-segmented {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-1);
	}

	.export-segmented.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.export-custom {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
		margin-top: var(--space-1);
	}

	.export-custom__field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
		color: var(--text-faint);
		font-size: var(--text-xs);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.export-custom input {
		width: 100%;
		min-width: 0;
		min-height: var(--size-touch);
		padding: 0 var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-elevated);
		color: var(--text);
		font: inherit;
		font-size: var(--text-sm);
		text-transform: none;
		letter-spacing: normal;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.export-custom input::-webkit-datetime-edit {
		padding: 0;
	}

	.export-custom input::-webkit-calendar-picker-indicator {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b9b1a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E");
		background-size: contain;
		background-repeat: no-repeat;
	}

	.export-custom input:hover {
		border-color: var(--accent-dim);
	}

	.export-custom input:focus-visible {
		outline: none;
		border-color: var(--accent-dim);
	}

	@media (max-width: 22rem) {
		.export-custom {
			grid-template-columns: 1fr;
		}
	}

	.export-segment {
		min-height: var(--size-touch);
		padding: var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: transparent;
		color: var(--text-faint);
		font: inherit;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.export-segment:hover,
	.export-segment:focus-visible {
		border-color: var(--accent-dim);
		color: var(--text-muted);
		outline: none;
	}

	.export-segment.active {
		border-color: var(--accent-dim);
		background: var(--fill-muted);
		color: var(--text);
	}

	.export-count {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.export-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
	}

	.export-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
	}

	.export-text {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		margin: 0;
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-elevated);
		color: var(--text-soft);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		line-height: var(--leading-normal);
	}

	@media (max-width: 24rem) {
		.export-actions,
		.export-segmented,
		.export-segmented.two {
			grid-template-columns: 1fr;
		}
	}
</style>
