<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import {
		resolveWeekStart,
		WEEK_START_OPTIONS,
		type WeekStart
	} from '$lib/preferences/week-start';
	import { useWeekStart } from '$lib/preferences/week-start.svelte';
	import { track } from '$lib/analytics';

	interface Props {
		labelledBy?: string;
	}

	let { labelledBy }: Props = $props();

	const i18n = useI18n();
	const weekStart = useWeekStart();
	const resolvedWeekStart = $derived(resolveWeekStart(weekStart.preference, i18n.locale));

	const optionMeta: Record<WeekStart, { labelKey: string }> = {
		1: { labelKey: 'weekStart.monday' },
		0: { labelKey: 'weekStart.sunday' }
	};

	function selectWeekStart(next: WeekStart): void {
		track('week_start_changed', { weekStart: next });
		weekStart.setWeekStart(next);
	}
</script>

<div
	class="switcher"
	role="group"
	aria-label={labelledBy ? undefined : i18n.t('weekStart.label')}
	aria-labelledby={labelledBy}
>
	{#each WEEK_START_OPTIONS as option}
		{@const meta = optionMeta[option]}
		{@const label = i18n.t(meta.labelKey)}
		<button
			type="button"
			class="week-start-btn"
			class:active={resolvedWeekStart === option}
			aria-label={label}
			aria-pressed={resolvedWeekStart === option}
			title={label}
			onclick={() => selectWeekStart(option)}
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

	.week-start-btn {
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

	.week-start-btn:hover,
	.week-start-btn:focus-visible {
		color: var(--text-muted);
		outline: none;
	}

	.week-start-btn.active {
		color: var(--text);
	}

	.label {
		line-height: 1;
	}
</style>
