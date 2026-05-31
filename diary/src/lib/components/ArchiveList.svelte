<script lang="ts">
	import ReflectEntryCard from '$lib/components/ReflectEntryCard.svelte';
	import ReflectStatusIcon from '$lib/components/ReflectStatusIcon.svelte';
	import ScoreDots from '$lib/components/ScoreDots.svelte';
	import { reflectActionLabel } from '$lib/events/format';
	import type { DayReflectionCalendarState } from '$lib/events/day-reflection';
	import type { ArchiveYearView } from '$lib/events/archive-view';
	import { getReflectionStatus } from '$lib/events/reflection-status';
	import { normalizeEventKind, type EventEntry, type EventKind } from '$lib/events/types';
	import { getLocaleDateFormat, useI18n } from '$lib/i18n';

	interface Props {
		archiveView: ArchiveYearView[];
		onOpenDay: (dayKey: string) => void;
		onOpenEntry: (entry: EventEntry) => void;
	}

	let { archiveView, onOpenDay, onOpenEntry }: Props = $props();

	const i18n = useI18n();

	function dayReflectionActionLabel(
		dayLabel: string,
		count: number,
		state: DayReflectionCalendarState
	): string {
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
</script>

<div class="entries-grouped">
	{#each archiveView as year (year.key)}
		<section class="group-year" aria-labelledby="journal-year-{year.key}">
			<div class="group-year-head">
				<h3 class="group-year-label" id="journal-year-{year.key}">{year.label}</h3>
				{#if year.score !== null}
					<ScoreDots compact original={year.score} />
				{/if}
			</div>
			{#each year.months as month (month.key)}
				<section class="group-month" aria-labelledby="journal-month-{month.key}">
					<div class="group-month-head">
						<h4 class="group-month-label" id="journal-month-{month.key}">{month.label}</h4>
						{#if month.score !== null}
							<ScoreDots compact original={month.score} />
						{/if}
					</div>
					{#each month.days as day (day.key)}
						<section class="group-day" aria-labelledby="journal-day-{day.key}">
							<button
								type="button"
								class="day-head-card"
								aria-label={dayReflectionActionLabel(
									day.label,
									day.entries.length,
									day.reflectionState
								)}
								onclick={() => onOpenDay(day.key)}
							>
								<h5 class="group-day-label" id="journal-day-{day.key}">{day.label}</h5>
								<div class="group-day-actions">
									{#if day.score !== null}
										<ScoreDots compact original={day.score} />
									{/if}
									{#if day.reflectionIcon}
										<ReflectStatusIcon name={day.reflectionIcon} />
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
											actionLabel={reflectActionLabel(reflectStatus, (k) => i18n.t(k))}
											kindLabel={eventKindLabel(normalizeEventKind(entry.kind))}
											timeLabel={new Date(entry.createdAt).toLocaleTimeString(
												getLocaleDateFormat(i18n.locale),
												{ hour: '2-digit', minute: '2-digit' }
											)}
											onOpen={() => onOpenEntry(entry)}
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

<style>
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
