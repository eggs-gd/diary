<script lang="ts">
	import EventKindIcon from '$lib/components/EventKindIcon.svelte';
	import { EVENT_KINDS, type EventKind } from '$lib/events/event-kind';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';

	interface Props {
		value?: EventKind | null;
	}

	let { value = $bindable<EventKind | null>(null) }: Props = $props();

	const i18n = useI18n();

	const labelKeys: Record<EventKind, string> = {
		event: 'capture.kindEvent',
		act: 'capture.kindAct'
	};

	function selectKind(next: EventKind): void {
		if (value === next) return;
		value = next;
		void hapticLight();
	}
</script>

<div class="kind-switcher" role="group" aria-label={i18n.t('capture.kindLabel')}>
	{#each EVENT_KINDS as kind}
		{@const label = i18n.t(labelKeys[kind])}
		<button
			type="button"
			class="kind-btn"
			class:active={value === kind}
			aria-label={label}
			aria-pressed={value === kind}
			title={label}
			onclick={() => selectKind(kind)}
		>
			<EventKindIcon {kind} />
		</button>
	{/each}
</div>

<style>
	.kind-switcher {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.kind-btn {
		display: grid;
		place-items: center;
		width: var(--size-touch);
		height: var(--size-touch);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--fill-subtle);
		color: var(--text-muted);
		font-size: var(--text-lg);
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.kind-btn :global(svg.app-icon) {
		width: 1em;
		height: 1em;
	}

	.kind-btn:hover,
	.kind-btn:focus-visible {
		border-color: var(--accent-dim);
		color: var(--text);
		outline: none;
	}

	.kind-btn.active {
		border-color: var(--accent);
		background: var(--fill-muted);
		color: var(--text);
	}
</style>
