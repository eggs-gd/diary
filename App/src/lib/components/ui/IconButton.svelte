<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		title?: string;
		expanded?: boolean;
		visible?: boolean;
		haspopup?: boolean | 'dialog';
		onclick: () => void;
		children: Snippet;
	}

	let {
		label,
		title,
		expanded = false,
		visible = true,
		haspopup,
		onclick,
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="icon-btn"
	class:expanded
	class:visible
	aria-label={label}
	aria-expanded={expanded}
	aria-haspopup={haspopup}
	title={title ?? label}
	{onclick}
>
	{@render children()}
</button>

<style>
	.icon-btn {
		display: grid;
		place-items: center;
		width: var(--size-ios-chrome);
		height: var(--size-ios-chrome);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--overlay-elevated);
		backdrop-filter: blur(6px);
		color: var(--text-muted);
		cursor: pointer;
		opacity: 1;
		pointer-events: auto;
		transform: translateY(0) scale(1);
		transition: var(--transition-fade);
		-webkit-tap-highlight-color: transparent;
	}

	.icon-btn:not(.visible) {
		opacity: 0;
		pointer-events: none;
		transform: translateY(var(--space-2)) scale(0.92);
	}

	.icon-btn:hover {
		border-color: var(--accent-dim);
		color: var(--text);
		transform: translateY(0) scale(1.05);
	}

	.icon-btn:focus {
		outline: none;
	}

	.icon-btn.expanded {
		border-color: var(--accent);
		background: var(--fill-muted);
		color: var(--text);
	}

	.icon-btn :global(svg.app-icon) {
		display: block;
		width: var(--text-lg);
		height: var(--text-lg);
	}
</style>
