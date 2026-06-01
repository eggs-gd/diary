<script lang="ts">
	import EventKindIcon from '$lib/components/EventKindIcon.svelte';
	import ReflectStatusIcon from '$lib/components/ReflectStatusIcon.svelte';
	import ScoreDots from '$lib/components/ScoreDots.svelte';
	import { eventReflectionDisplayIcon } from '$lib/events/reflection-display';
	import { normalizeEventKind, type EventEntry } from '$lib/events/types';
	import type { ReflectionStatus } from '$lib/events/reflection-status';

	interface Props {
		entry: EventEntry;
		reflectStatus: ReflectionStatus;
		actionLabel: string;
		variant?: 'archive' | 'compact';
		showKind?: boolean;
		showReflection?: boolean;
		kindLabel?: string;
		timeLabel?: string;
		onOpen: () => void;
	}

	let {
		entry,
		reflectStatus,
		actionLabel,
		variant = 'archive',
		showKind = variant === 'archive',
		showReflection = true,
		kindLabel = '',
		timeLabel = '',
		onOpen
	}: Props = $props();

	const entryKind = $derived(normalizeEventKind(entry.kind));
	const displayIcon = $derived(eventReflectionDisplayIcon(reflectStatus));
	const displayScore = $derived(showReflection ? entry.score : (entry.protocol?.reflectionScore ?? entry.score));
	const reflectedScore = $derived(showReflection ? entry.protocol?.reflectionScore : undefined);
</script>

<button
	type="button"
	class="reflect-entry"
	class:reflect-entry--archive={variant === 'archive'}
	class:reflect-entry--compact={variant === 'compact'}
	aria-label={actionLabel}
	onclick={onOpen}
>
	{#if variant === 'archive'}
		<div class="reflect-entry__head">
			<p class="reflect-entry__text">{entry.text}</p>
			{#if timeLabel}
				<time class="reflect-entry__time" datetime={entry.createdAt}>{timeLabel}</time>
			{/if}
		</div>
		<div class="reflect-entry__foot">
			<div class="reflect-entry__meta">
				{#if showKind}
					<span class="reflect-entry__kind" aria-label={kindLabel} title={kindLabel}>
						<EventKindIcon kind={entryKind} />
					</span>
				{/if}
				<ScoreDots original={displayScore} reflected={reflectedScore} />
			</div>
			{#if showReflection && displayIcon}
				<ReflectStatusIcon name={displayIcon} />
			{/if}
		</div>
	{:else}
		<p class="reflect-entry__text">{entry.text}</p>
		<div class="reflect-entry__dots">
			<ScoreDots
				compact
				original={displayScore}
				reflected={reflectedScore}
			/>
		</div>
		{#if showReflection && displayIcon}
			<ReflectStatusIcon name={displayIcon} />
		{/if}
	{/if}
</button>

<style>
	.reflect-entry {
		display: block;
		width: 100%;
		margin: 0;
		padding: var(--space-3) 0;
		border: none;
		border-bottom: 1px solid var(--border);
		border-radius: 0;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.reflect-entry:hover,
	.reflect-entry:focus-visible {
		background: var(--fill-subtle);
		outline: none;
	}

	.reflect-entry--archive {
		display: grid;
		gap: var(--space-2);
	}

	.reflect-entry--compact {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.reflect-entry__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.reflect-entry__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.reflect-entry__meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.reflect-entry__kind {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.375rem;
		height: 1.375rem;
		color: var(--text-faint);
		font-size: 1.125rem;
	}

	.reflect-entry__text {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-size: var(--text-base);
		color: var(--text-soft);
		line-height: var(--leading-tight);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.reflect-entry__time {
		flex-shrink: 0;
		font-size: var(--text-sm);
		color: var(--text-faint);
		white-space: nowrap;
	}

	.reflect-entry__dots {
		flex-shrink: 0;
		align-self: center;
		padding-top: 0.1em;
	}
</style>
