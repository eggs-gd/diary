<script lang="ts">
	import { onMount } from 'svelte';
	import { AppButton } from '$lib/components/ui';
	import ReflectionEvent from '$lib/components/ReflectionEvent.svelte';
	import ScoreDots from '$lib/components/ScoreDots.svelte';
	import { groupEventEntries } from '$lib/events/grouping';
	import { getReflectionStatus, type ReflectionStatus } from '$lib/events/reflection-status';
	import type { EventEntry } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';
	import { eventStore } from '$lib/state/events.svelte';
	import { track, trackVisible } from '$lib/analytics';

	const i18n = useI18n();

	// Capture form state
	let eventText = $state('');
	let score = $state(0);
	let eventInput = $state<HTMLTextAreaElement | null>(null);
	const rangeFill = $derived(getRangeFill(score));

	// Archive
	const groupedEntries = $derived(groupEventEntries(eventStore.entries, i18n.locale));

	// Reflection state
	let selectedEntry = $state<EventEntry | null>(null);

	onMount(() => {
		void eventStore.load();
	});

	function getRangeFill(value: number): string {
		const marker = ((value + 10) / 20) * 100;
		return `linear-gradient(90deg,
			color-mix(in srgb, var(--accent-rose) 58%, transparent) 0%,
			color-mix(in srgb, var(--accent) 42%, transparent) 50%,
			color-mix(in srgb, var(--accent-leaf) 58%, transparent) 100%),
			linear-gradient(90deg, transparent ${marker}%, color-mix(in srgb, var(--bg) 56%, transparent) ${marker}%)`;
	}

	function scoreLabel(value: number): string {
		return value > 0 ? `+${value}` : String(value);
	}

	function tone(scoreValue: number): 'negative' | 'positive' {
		return scoreValue <= 0 ? 'negative' : 'positive';
	}

	function reflectActionLabel(status: ReflectionStatus): string {
		const map: Record<ReflectionStatus, string> = {
			empty: i18n.t('archive.reflectEmpty'),
			partial: i18n.t('archive.reflectPartial'),
			complete: i18n.t('archive.reflectComplete')
		};
		return map[status];
	}

	async function submitEvent(): Promise<void> {
		const text = eventText.trim();
		if (!text) {
			eventInput?.focus();
			return;
		}

		const entry: EventEntry = {
			id: crypto.randomUUID(),
			text,
			score,
			createdAt: new Date().toISOString(),
			protocol: { event: text, reason: '', about: '', view: '', actions: '' }
		};

		await eventStore.add(entry);
		eventText = '';
		score = 0;
		track('event_saved', { score: entry.score, tone: tone(entry.score) });
		void hapticLight();
	}

	function openAnalysis(entry: EventEntry): void {
		selectedEntry = entry;
		track('analysis_opened', { score: entry.score });
		void hapticLight();
	}
</script>

<main class="main">
	<header class="site-header" use:trackVisible={{ event: 'home_header_viewed' }}>
		<h1 class="logo">觀明</h1>
		<p class="tagline">{i18n.t('app.tagline')}</p>
	</header>

	<form class="capture" onsubmit={(event) => (event.preventDefault(), void submitEvent())}>
		<label class="field-label" for="event-text">{i18n.t('capture.event')}</label>
		<textarea
			id="event-text"
			bind:this={eventInput}
			bind:value={eventText}
			placeholder={i18n.t('capture.placeholder')}
			rows="3"
		></textarea>

		<div class="scale-head">
			<label class="field-label" for="event-score">{i18n.t('capture.resonance')}</label>
			<p class="score-value" class:positive={score > 0} class:negative={score <= 0}>
				{scoreLabel(score)}
			</p>
		</div>
		<input
			id="event-score"
			type="range"
			min="-10"
			max="10"
			step="1"
			bind:value={score}
			style:--range-fill={rangeFill}
		/>
		<div class="scale-labels" aria-hidden="true">
			<span>-10</span>
			<span>0</span>
			<span>+10</span>
		</div>

		<AppButton variant="primary" fullWidth type="submit" disabled={!eventText.trim()}>
			{#snippet children()}{i18n.t('capture.save')}{/snippet}
		</AppButton>
	</form>

	<section class="archive" use:trackVisible={{ event: 'archive_viewed' }}>
		<div class="archive-head">
			<h2 class="archive-title">{i18n.t('archive.title')}</h2>
			<span class="counter">{eventStore.entries.length}</span>
		</div>

		{#if eventStore.entries.length === 0}
			<p class="empty">{i18n.t('archive.empty')}</p>
		{:else}
			<div class="entries-grouped">
				{#each groupedEntries as year (year.key)}
					<section class="group-year" aria-labelledby="journal-year-{year.key}">
						<h3 class="group-year-label" id="journal-year-{year.key}">{year.label}</h3>
						{#each year.months as month (month.key)}
							<section class="group-month" aria-labelledby="journal-month-{month.key}">
								<h4 class="group-month-label" id="journal-month-{month.key}">{month.label}</h4>
								{#each month.days as day (day.key)}
									<section class="group-day" aria-labelledby="journal-day-{day.key}">
										<h5 class="group-day-label" id="journal-day-{day.key}">{day.label}</h5>
										<ul class="entries">
											{#each day.entries as entry (entry.id)}
												{@const reflectStatus = getReflectionStatus(entry)}
												<li>
													<article class="entry">
														<div class="entry-head">
															<p class="entry-text">{entry.text}</p>
															<time
																class="entry-time"
																datetime={entry.createdAt}
															>
																{new Date(entry.createdAt).toLocaleTimeString(
																	i18n.locale === 'uk' ? 'uk-UA' : 'en-US',
																	{ hour: '2-digit', minute: '2-digit' }
																)}
															</time>
														</div>
														<div class="entry-foot">
															<ScoreDots
																original={entry.score}
																reflected={entry.protocol?.reflectionScore}
															/>
															<button
																type="button"
																class="reflect-action"
																class:reflect-action--empty={reflectStatus === 'empty'}
																class:reflect-action--partial={reflectStatus === 'partial'}
																class:reflect-action--complete={reflectStatus === 'complete'}
																aria-label={reflectActionLabel(reflectStatus)}
																onclick={() => openAnalysis(entry)}
															>
																{#if reflectStatus === 'complete'}
																	<svg viewBox="0 0 24 24" aria-hidden="true">
																		<path
																			d="M12 4V1 8 5 12 1v3c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
																		/>
																	</svg>
																{:else}
																	<svg viewBox="0 0 24 24" aria-hidden="true">
																		<path
																			d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z"
																		/>
																	</svg>
																{/if}
															</button>
														</div>
													</article>
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

<ReflectionEvent
	open={selectedEntry !== null}
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
		selectedEntry = null;
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
		margin-bottom: var(--space-7);
	}

	.logo {
		font-size: var(--text-hero);
		color: var(--accent);
		letter-spacing: var(--tracking-hero);
	}

	.tagline,
	.field-label {
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-hero);
		color: var(--text-faint);
	}

	.capture {
		display: grid;
		gap: var(--space-3);
		margin-bottom: var(--space-7);
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--border);
	}

	.capture textarea {
		min-height: 7rem;
	}

	.scale-head,
	.scale-labels {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.score-value {
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		line-height: 1;
	}

	.score-value.positive {
		color: var(--accent-leaf);
	}

	.score-value.negative {
		color: var(--accent-rose);
	}

	.scale-labels {
		margin-top: calc(-1 * var(--space-2));
		color: var(--text-faint);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-caps);
	}

	.archive {
		margin-bottom: var(--space-7);
	}

	.archive-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.archive-title {
		margin: 0;
		font-size: var(--text-xl);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: var(--text-muted);
	}

	.counter {
		font-size: var(--text-sm);
		color: var(--text-faint);
		letter-spacing: var(--tracking-wide);
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

	.group-year-label {
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		color: var(--text-muted);
		letter-spacing: var(--tracking-caps);
		margin-bottom: var(--space-4);
	}

	.group-month {
		margin-bottom: var(--space-5);
	}

	.group-month:last-child {
		margin-bottom: 0;
	}

	.group-month-label {
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: var(--text-faint);
		margin-bottom: var(--space-3);
	}

	.group-day {
		margin-bottom: var(--space-4);
	}

	.group-day:last-child {
		margin-bottom: 0;
	}

	.group-day-label {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		color: var(--text-muted);
		margin-bottom: var(--space-1);
	}

	.entries {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.entries li {
		border: none;
	}

	.entry {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border);
	}

	.entry-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.entry-text {
		flex: 1;
		min-width: 0;
		font-size: var(--text-base);
		color: var(--text-soft);
		line-height: var(--leading-tight);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.entry-time {
		flex-shrink: 0;
		font-size: var(--text-sm);
		color: var(--text-faint);
		white-space: nowrap;
	}

	.entry-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.reflect-action {
		display: inline-flex;
		flex-shrink: 0;
		margin-left: auto;
		align-items: center;
		padding: var(--space-1) 0;
		border: none;
		background: none;
		color: var(--text-faint);
		cursor: pointer;
		transition: color var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.reflect-action svg {
		width: 1.125rem;
		height: 1.125rem;
		fill: currentColor;
	}

	.reflect-action--empty {
		color: var(--accent);
	}

	.reflect-action--partial {
		color: var(--text-faint);
	}

	.reflect-action--complete {
		color: var(--text-muted);
	}

	.reflect-action:hover,
	.reflect-action:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.reflect-action--empty:hover,
	.reflect-action--empty:focus-visible {
		color: var(--accent-dim);
	}

	@media (max-width: 24rem) {
		.entry-head {
			flex-wrap: wrap;
		}
	}
</style>
