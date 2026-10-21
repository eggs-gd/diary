<script lang="ts">
	import type { Snippet } from 'svelte';
	import { portalToBody } from '$lib/actions/portal-to-body';
	import { useI18n } from '$lib/i18n';
	import AppButton from './AppButton.svelte';
	import { useDialog } from './use-dialog.svelte';

	type PopupSize = 'default' | 'wide';

	interface Props {
		open: boolean;
		title: string;
		onClose: () => void;
		closeLabel?: string;
		titleId?: string;
		size?: PopupSize;
		/** false: no close button, Esc or backdrop dismissal, opaque backdrop (the user must act in the popup). */
		dismissible?: boolean;
		scrollable?: boolean;
		bodyClass?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let {
		open,
		title,
		onClose,
		closeLabel,
		titleId,
		size = 'default',
		dismissible = true,
		scrollable = false,
		bodyClass = '',
		children,
		footer
	}: Props = $props();

	const i18n = useI18n();
	const resolvedCloseLabel = $derived(closeLabel ?? i18n.t('common.close'));

	let dialog = $state<HTMLDialogElement | null>(null);
	const { dismiss, handleDialogClose, handleCancel } = useDialog(
		() => open,
		() => onClose,
		() => dialog
	);
</script>

<dialog
	use:portalToBody
	bind:this={dialog}
	class="popup"
	class:wide={size === 'wide'}
	class:blocking={!dismissible}
	class:scrollable
	tabindex="-1"
	aria-labelledby={titleId}
	onclose={() => {
		if (dismissible) handleDialogClose();
		// A forced close (a second Esc in some browsers) brings the blocking popup back.
		else if (open && dialog && !dialog.open) dialog.showModal();
	}}
	oncancel={(event) => (dismissible ? handleCancel(event) : event.preventDefault())}
	onclick={(event) => {
		if (dismissible && event.target === dialog) dismiss();
	}}
>
	<h3 id={titleId} class="popup-title">{title}</h3>

	<div class="popup-body {bodyClass}">
		{@render children()}
	</div>

	<footer class="popup-footer" class:has-actions={!!footer}>
		{#if dismissible}
			<AppButton variant="popup-close" onclick={dismiss}>{resolvedCloseLabel}</AppButton>
		{/if}
		{#if footer}
			<div class="popup-footer-actions">
				{@render footer()}
			</div>
		{/if}
	</footer>
</dialog>

<style>
	.popup {
		width: min(calc(var(--content-max-width) * 0.9), calc((100dvw - 2.5rem) * 0.9));
		max-width: calc(100dvw - 2.5rem);
		margin: auto;
		padding: var(--space-5) var(--space-5) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-paper);
		color: var(--text);
		outline: none;
	}

	.popup.wide {
		width: min(calc(var(--content-max-width) * 1.1), calc(100dvw - 2rem));
	}

	.popup:not([open]) {
		display: none;
	}

	.popup.scrollable[open] {
		display: flex;
		flex-direction: column;
		max-height: var(--popup-max-height);
		overflow: hidden;
	}

	.popup::backdrop {
		background: var(--overlay-scrim);
	}

	.popup.blocking::backdrop {
		background: #000;
	}

	.popup-title {
		margin: 0 0 var(--space-3);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text);
		flex-shrink: 0;
	}

	.popup-body {
		margin-bottom: 0;
	}

	.popup-body:not(:last-child) {
		margin-bottom: var(--space-4);
	}

	.popup.scrollable[open] .popup-body {
		flex: 1 1 auto;
		min-height: 3rem;
		max-height: calc(var(--popup-max-height) - 7.5rem);
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
	}

	.popup-footer {
		flex-shrink: 0;
		display: grid;
		gap: var(--space-2);
	}

	.popup-footer.has-actions {
		grid-template-columns: auto 1fr;
		align-items: stretch;
	}

	.popup-footer:not(.has-actions) {
		grid-template-columns: 1fr;
	}

	.popup-footer:not(.has-actions) :global(.btn.popup-close) {
		width: 100%;
	}

	.popup-footer-actions {
		display: flex;
		min-width: 0;
		gap: var(--space-2);
	}

	.popup-footer-actions :global(.btn) {
		flex: 1;
		min-width: 0;
	}
</style>
