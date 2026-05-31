<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { REFLECTION_TONE_OPTIONS, type ReflectionTone } from '$lib/preferences/reflection-tone';
	import { useReflectionTone } from '$lib/preferences/reflection-tone.svelte';
	import { track } from '$lib/analytics';

	interface Props {
		labelledBy?: string;
	}

	let { labelledBy }: Props = $props();

	const i18n = useI18n();
	const reflectionTone = useReflectionTone();

	const optionMeta: Record<ReflectionTone, { labelKey: string }> = {
		gentle: { labelKey: 'reflectionTone.gentle' },
		aggressive: { labelKey: 'reflectionTone.aggressive' }
	};

	function selectTone(next: ReflectionTone): void {
		track('reflection_tone_changed', { tone: next });
		reflectionTone.setTone(next);
	}
</script>

<div
	class="switcher"
	role="group"
	aria-label={labelledBy ? undefined : i18n.t('reflectionTone.label')}
	aria-labelledby={labelledBy}
>
	{#each REFLECTION_TONE_OPTIONS as option}
		{@const meta = optionMeta[option]}
		{@const label = i18n.t(meta.labelKey)}
		<button
			type="button"
			class="tone-btn"
			class:active={reflectionTone.preference === option}
			aria-label={label}
			aria-pressed={reflectionTone.preference === option}
			title={label}
			onclick={() => selectTone(option)}
		>
			<span class="label" aria-hidden="true">{label}</span>
		</button>
	{/each}
</div>

<style>
	.switcher {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.tone-btn {
		min-height: var(--size-touch);
		padding: 0 var(--space-1);
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--text-faint);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		cursor: pointer;
		transition: color var(--transition-interactive);
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.tone-btn:hover,
	.tone-btn:focus-visible {
		color: var(--text-muted);
		outline: none;
	}

	.tone-btn.active {
		color: var(--text);
	}

	.label {
		line-height: 1;
		white-space: nowrap;
	}
</style>
