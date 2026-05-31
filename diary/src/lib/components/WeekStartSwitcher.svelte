<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { resolveWeekStart, WEEK_START_OPTIONS, type WeekStart } from '$lib/preferences/week-start';
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
		display: grid;
		place-items: center;
		width: var(--size-touch);
		height: var(--size-touch);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--overlay-elevated);
		backdrop-filter: blur(6px);
		color: var(--text-muted);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		transition: var(--transition-fade);
		user-select: none;
	}

	.week-start-btn:hover {
		border-color: var(--accent-dim);
		color: var(--text);
		transform: scale(1.05);
	}

	.week-start-btn.active {
		border-color: var(--accent);
		background: var(--fill-muted);
		color: var(--text);
		box-shadow: 0 0 0 1px var(--fill-muted);
	}

	.label {
		line-height: 1;
	}
</style>
