<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text' | 'popup-close';

	interface Props {
		variant?: ButtonVariant;
		type?: 'button' | 'submit';
		fullWidth?: boolean;
		disabled?: boolean;
		pressed?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void | Promise<void>;
		children: Snippet;
	}

	let {
		variant = 'secondary',
		type = 'button',
		fullWidth = false,
		disabled = false,
		pressed,
		class: className = '',
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	class="btn {className}"
	class:primary={variant === 'primary'}
	class:secondary={variant === 'secondary'}
	class:danger={variant === 'danger'}
	class:text={variant === 'text'}
	class:popup-close={variant === 'popup-close'}
	class:full-width={fullWidth}
	class:pressed={pressed === true}
	aria-pressed={pressed}
	{onclick}
>
	{@render children()}
</button>

<style>
	.btn {
		font: inherit;
		border-radius: var(--radius);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.btn.full-width {
		width: 100%;
	}

	.btn.primary {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--accent-dim);
		background: var(--accent-dim);
		color: var(--bg);
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
		text-align: center;
		transition: var(--transition-interactive);
	}

	.btn.primary:not(:disabled):hover {
		background: var(--accent);
		border-color: var(--accent);
	}

	.btn.secondary {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
		text-align: left;
		transition: var(--transition-interactive);
	}

	.btn.secondary:not(:disabled):hover {
		border-color: var(--accent-dim);
		color: var(--text);
	}

	.btn.danger {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border-warning);
		background: var(--fill-warning);
		color: var(--line-changing);
		font-size: var(--text-sm);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
		transition: var(--transition-interactive);
	}

	.btn.danger:not(:disabled):hover {
		border-color: var(--line-changing);
		background: var(--fill-warning-strong);
		color: var(--text);
	}

	.btn.text {
		padding: var(--space-2) 0;
		border: none;
		background: none;
		color: var(--text-faint);
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		transition: var(--transition);
	}

	.btn.text:not(:disabled):hover,
	.btn.text.pressed {
		color: var(--text);
	}

	.btn.text.pressed {
		color: var(--accent);
	}

	.btn.popup-close {
		min-height: var(--size-touch);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text-faint);
		font-size: var(--text-sm);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		transition: var(--transition-interactive);
	}

	.btn.popup-close:not(:disabled):hover {
		border-color: var(--accent-dim);
		color: var(--text);
	}
</style>
