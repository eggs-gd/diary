<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { portalToBody } from '$lib/actions/portal-to-body';
	import { useI18n } from '$lib/i18n';
	import { subscribeVisualViewport } from '$lib/platform/keyboard-viewport';
	import { lockDocumentScroll } from '$lib/platform/scroll-lock';
	import AppButton from './AppButton.svelte';
	import { useDialog } from './use-dialog.svelte';

	interface Props {
		open: boolean;
		title?: string;
		titleId?: string;
		labelledBy?: string;
		closeLabel?: string;
		onClose: () => void;
		children: Snippet;
		header?: Snippet;
		bodyFill?: boolean;
		keyboardAware?: boolean;
		showClose?: boolean;
		onViewportChange?: () => void;
	}

	let {
		open,
		title,
		titleId = 'fullscreen-title',
		labelledBy,
		closeLabel,
		onClose,
		children,
		header,
		bodyFill = false,
		keyboardAware = false,
		showClose = true,
		onViewportChange
	}: Props = $props();

	const i18n = useI18n();
	const resolvedCloseLabel = $derived(closeLabel ?? i18n.t('common.close'));
	const ariaLabelId = $derived(labelledBy ?? (header ? undefined : titleId));

	let dialog = $state<HTMLDialogElement | null>(null);

	const { dismiss, handleDialogClose, handleCancel } = useDialog(
		() => open,
		() => onClose,
		() => dialog
	);

	$effect(() => {
		if (!browser || !open) return;

		dialog;
		return lockDocumentScroll(() => dialog);
	});
	$effect(() => {
		if (!browser || !open || !keyboardAware || !dialog) return;
		return subscribeVisualViewport(dialog, () => onViewportChange?.());
	});
</script>

<dialog
	use:portalToBody
	bind:this={dialog}
	class="fullscreen"
	class:keyboard-aware={keyboardAware}
	tabindex="-1"
	aria-labelledby={ariaLabelId}
	onclose={handleDialogClose}
	oncancel={handleCancel}
>
	{#if header}
		<header class="shell-header shell-header--custom">
			<div class="shell-header__inner">
				{@render header()}
			</div>
		</header>
	{:else if title}
		<header class="shell-header">
			<div class="shell-header__inner">
				<h1 id={titleId} class="shell-title">{title}</h1>
			</div>
		</header>
	{/if}

	<div class="shell-body" class:shell-body--fill={bodyFill} class:shell-body--no-close={!showClose}>
		{@render children()}
	</div>

	{#if showClose}
		<div class="shell-close">
			<AppButton variant="popup-close" onclick={dismiss}>{resolvedCloseLabel}</AppButton>
		</div>
	{/if}
</dialog>

<style>
	.fullscreen {
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: var(--bg);
		color: var(--text);
		outline: none;
		overflow: hidden;
	}

	.fullscreen:not([open]) {
		display: none;
	}

	.fullscreen[open] {
		display: flex;
		flex-direction: column;
	}

	.fullscreen.keyboard-aware {
		inset: auto;
		left: 0;
		right: 0;
		width: 100%;
		top: var(--visual-viewport-offset-top, 0px);
		height: var(--visual-viewport-height, 100dvh);
		max-height: var(--visual-viewport-height, 100dvh);
	}

	.fullscreen::backdrop {
		background: var(--overlay-scrim);
	}

	.shell-header {
		flex-shrink: 0;
		min-width: 0;
		overflow-x: clip;
		padding: calc(var(--space-3) + env(safe-area-inset-top, 0px))
			calc(var(--space-4) + env(safe-area-inset-right, 0px)) var(--space-2)
			calc(var(--space-4) + env(safe-area-inset-left, 0px));
		border-bottom: 1px solid var(--border);
	}

	.shell-header__inner {
		width: 100%;
		max-width: min(100%, var(--content-max-width));
		margin-inline: auto;
		min-width: 0;
	}

	.shell-header--custom .shell-header__inner {
		font-size: clamp(14px, 1rem, 16px);
	}

	.shell-header--custom {
		padding-bottom: var(--space-2);
	}

	.shell-title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text);
	}

	.shell-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		padding: var(--space-4) calc(var(--space-4) + env(safe-area-inset-right, 0px))
			calc(5rem + env(safe-area-inset-bottom, 0px))
			calc(var(--space-4) + env(safe-area-inset-left, 0px));
	}

	.shell-body--fill {
		display: flex;
		flex-direction: column;
	}

	.shell-body--no-close {
		padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
	}

	.shell-close {
		position: absolute;
		right: calc(var(--space-4) + env(safe-area-inset-right, 0px));
		bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
		z-index: 2;
		pointer-events: auto;
	}
</style>
