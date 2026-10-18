<script lang="ts">
	import { track } from '$lib/analytics';
	import { useI18n } from '$lib/i18n';
	import { useReflectionEnabled } from '$lib/preferences';

	interface Props {
		labelledBy?: string;
	}

	let { labelledBy }: Props = $props();

	const i18n = useI18n();
	const reflection = useReflectionEnabled();

	function setEnabled(next: boolean): void {
		if (reflection.enabled === next) return;
		reflection.setEnabled(next);
		track('reflection_feature_changed', { enabled: next });
	}
</script>

<div
	class="switcher"
	role="group"
	aria-label={labelledBy ? undefined : i18n.t('reflectionFeature.label')}
	aria-labelledby={labelledBy}
>
	<button
		type="button"
		class="feature-btn"
		class:active={!reflection.enabled}
		aria-label={i18n.t('reflectionFeature.off')}
		aria-pressed={!reflection.enabled}
		onclick={() => setEnabled(false)}
	>
		{i18n.t('reflectionFeature.offShort')}
	</button>
	<button
		type="button"
		class="feature-btn"
		class:active={reflection.enabled}
		aria-label={i18n.t('reflectionFeature.on')}
		aria-pressed={reflection.enabled}
		onclick={() => setEnabled(true)}
	>
		{i18n.t('reflectionFeature.onShort')}
	</button>
</div>

<style>
	.switcher {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.feature-btn {
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

	.feature-btn:hover,
	.feature-btn:focus-visible {
		color: var(--text-muted);
		outline: none;
	}

	.feature-btn.active {
		color: var(--text);
	}
</style>
