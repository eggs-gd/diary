<script lang="ts">
	import { buildScoreDots, scoreDotsLabel } from '$lib/events/score-dots';

	interface Props {
		original: number;
		reflected?: number;
	}

	let { original, reflected }: Props = $props();

	const dots = $derived(buildScoreDots(original, reflected));
	const label = $derived(scoreDotsLabel(original, reflected));
</script>

<div class="score-dots" role="img" aria-label={label}>
	{#each dots as dot, index (index)}
		{#if dot.tone === 'gap'}
			<span class="score-dot-gap" aria-hidden="true"></span>
		{:else}
			<span
				class="score-dot"
				class:score-dot--positive-muted={dot.polarity === 'positive' && dot.tone === 'muted'}
				class:score-dot--positive-bright={dot.polarity === 'positive' && dot.tone === 'bright'}
				class:score-dot--negative-muted={dot.polarity === 'negative' && dot.tone === 'muted'}
				class:score-dot--negative-bright={dot.polarity === 'negative' && dot.tone === 'bright'}
				class:score-dot--gray={dot.tone === 'gray'}
				aria-hidden="true"
			></span>
		{/if}
	{/each}
</div>

<style>
	.score-dots {
		display: flex;
		flex: 1 1 auto;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		min-width: 0;
		min-height: 0.5rem;
	}

	.score-dot {
		width: 0.4375rem;
		height: 0.4375rem;
		border-radius: var(--radius-full);
	}

	.score-dot-gap {
		width: 0.4375rem;
		flex-shrink: 0;
	}

	.score-dot--positive-muted {
		background: color-mix(in srgb, var(--accent-leaf) 42%, transparent);
	}

	.score-dot--positive-bright {
		background: var(--accent-leaf);
	}

	.score-dot--negative-muted {
		background: color-mix(in srgb, var(--accent-rose) 42%, transparent);
	}

	.score-dot--negative-bright {
		background: var(--accent-rose);
	}

	.score-dot--gray {
		background: color-mix(in srgb, var(--text-faint) 38%, transparent);
	}
</style>
