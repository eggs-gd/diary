<script lang="ts">
	import { Capacitor } from '@capacitor/core';
	import { AppButton, AppFullscreen, AppPopup } from '$lib/components/ui';
	import { groupEventEntries } from '$lib/events/grouping';
	import {
		archiveFilename,
		buildAgentPrompt,
		buildArchiveMarkdown,
		filterEntriesByRange,
		type ExportMode,
		type ExportRange
	} from '$lib/events/export';
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

	const selectedEntries = $derived(
		filterEntriesByRange(entries, range, resolveWeekStart(weekStart, i18n.locale), dayEndHour)
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

		if (
			Capacitor.isNativePlatform() &&
			typeof navigator !== 'undefined' &&
			typeof navigator.share === 'function'
		) {
			try {
				await navigator.share({
					title: filename,
					text: payload
				});
				return;
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') return;
			}
		}

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
			await navigator.clipboard.writeText(previewText);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {}
	}
</script>

<AppPopup
	{open}
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
							onclick={() => (range = option.value)}
						>
							{i18n.t(option.labelKey)}
						</button>
					{/each}
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
		<AppButton variant="primary" disabled={selectedEntries.length === 0} onclick={() => void exportArchive()}>
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
