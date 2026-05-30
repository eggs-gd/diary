<script lang="ts">
	import type { Snippet } from 'svelte';

	type FieldLabelSize = 'default' | 'compact' | 'row';

	interface Props {
		size?: FieldLabelSize;
		/** Use for <fieldset><legend> */
		asLegend?: boolean;
		children: Snippet;
	}

	let { size = 'default', asLegend = false, children }: Props = $props();
</script>

{#if asLegend}
	<legend class="field-label" class:compact={size === 'compact'} class:row={size === 'row'}>
		{@render children()}
	</legend>
{:else}
	<span class="field-label" class:compact={size === 'compact'} class:row={size === 'row'}>
		{@render children()}
	</span>
{/if}

<style>
	.field-label {
		display: block;
		font-size: var(--text-base);
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
		color: var(--text-muted);
	}

	.field-label.compact {
		margin-bottom: var(--space-2);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-caps);
	}

	.field-label.row {
		margin-bottom: 0;
		font-size: var(--text-sm);
		font-weight: 500;
		letter-spacing: var(--tracking-wide);
		color: var(--text-faint);
		flex-shrink: 0;
	}

	legend.field-label {
		margin-bottom: var(--space-3);
		padding: 0;
	}

	span.field-label:not(.compact):not(.row) {
		margin-bottom: var(--space-2);
	}
</style>
