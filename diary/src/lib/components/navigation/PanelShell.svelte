<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { subscribeVisualViewport } from '$lib/platform/keyboard-viewport';

	interface Props {
		/** Top of stack — effects, keyboard viewport. */
		isTop?: boolean;
		/** Shown in deck (during slide transitions too). */
		visible?: boolean;
		labelledBy?: string;
		/** Floating back + trailing toolbar over scroll. */
		chrome?: Snippet;
		/** Floating bottom toolbar (e.g. wizard prev/next). */
		footerChrome?: Snippet;
		children: Snippet;
		bodyFill?: boolean;
		keyboardAware?: boolean;
		onViewportChange?: () => void;
	}

	let {
		isTop = true,
		visible = true,
		labelledBy,
		chrome,
		footerChrome,
		children,
		bodyFill = false,
		keyboardAware = false,
		onViewportChange
	}: Props = $props();

	let root = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!browser || !isTop || !keyboardAware || !root) return;
		return subscribeVisualViewport(root, () => onViewportChange?.());
	});
</script>

<section
	bind:this={root}
	class="panel-shell"
	class:panel-shell--keyboard={keyboardAware}
	class:panel-shell--inactive={!visible}
	class:panel-shell--with-chrome={!!chrome}
	class:panel-shell--with-footer-chrome={!!footerChrome}
	aria-labelledby={labelledBy}
	inert={!visible ? true : undefined}
>
	<div class="shell-body" class:shell-body--fill={bodyFill}>
		{@render children()}
	</div>

	{#if chrome}
		<div class="panel-shell__chrome">
			{@render chrome()}
		</div>
	{/if}

	{#if footerChrome}
		<div class="panel-shell__footer-chrome">
			{@render footerChrome()}
		</div>
	{/if}
</section>

<style>
	.panel-shell {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
		background: var(--bg);
		color: var(--text);
		overflow: hidden;
	}

	.panel-shell--inactive {
		opacity: 0;
		pointer-events: none;
	}

	.panel-shell--keyboard {
		height: var(--visual-viewport-height, 100dvh);
		max-height: var(--visual-viewport-height, 100dvh);
		margin-top: var(--visual-viewport-offset-top, 0px);
	}

	.shell-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		touch-action: pan-y;
		padding: var(--space-4) calc(var(--space-4) + env(safe-area-inset-right, 0px))
			calc(var(--space-4) + env(safe-area-inset-bottom, 0px))
			calc(var(--space-4) + env(safe-area-inset-left, 0px));
	}

	.panel-shell--with-chrome .shell-body {
		padding-top: var(--panel-chrome-inset);
	}

	.panel-shell--with-footer-chrome .shell-body {
		padding-bottom: var(--panel-chrome-footer-inset);
	}

	.panel-shell__chrome {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: var(--panel-chrome-inset);
		z-index: var(--z-chrome);
		pointer-events: none;
	}

	.panel-shell__chrome :global(.chrome-float-start),
	.panel-shell__chrome :global(.chrome-float-end),
	.panel-shell__chrome :global(.chrome-float-bottom),
	.panel-shell__chrome :global(.chrome-actions) {
		pointer-events: auto;
	}

	.panel-shell__footer-chrome {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: var(--z-chrome);
		pointer-events: none;
	}

	.panel-shell__footer-chrome :global(.chrome-float-bottom) {
		position: relative;
		pointer-events: auto;
	}

	.shell-body--fill {
		display: flex;
		flex-direction: column;
	}
</style>
