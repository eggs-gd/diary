<script lang="ts">
	import { AppIcon, type IconName } from '$lib/icons';

	interface Props {
		icon: IconName;
		label: string;
		onclick?: () => void;
		disabled?: boolean;
		type?: 'button' | 'submit';
		expanded?: boolean;
	}

	let {
		icon,
		label,
		onclick,
		disabled = false,
		type = 'button',
		expanded = false
	}: Props = $props();
</script>

<button
	{type}
	class="chrome-round-btn"
	class:expanded
	aria-label={label}
	{disabled}
	onclick={onclick}
>
	<AppIcon name={icon} />
</button>

<style>
	.chrome-round-btn {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: var(--size-ios-chrome);
		height: var(--size-ios-chrome);
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: var(--shadow-chrome);
		color: var(--text-muted);
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.chrome-round-btn:hover:not(:disabled),
	.chrome-round-btn:focus-visible:not(:disabled) {
		border-color: var(--accent-dim);
		color: var(--text);
		outline: none;
	}

	.chrome-round-btn.expanded {
		border-color: var(--accent-dim);
		background: var(--fill-muted);
		color: var(--text);
	}

	.chrome-round-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.chrome-round-btn :global(svg.app-icon) {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
