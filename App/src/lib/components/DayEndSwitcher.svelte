<script lang="ts">
	import { track } from '$lib/analytics';
	import { useI18n } from '$lib/i18n';
	import { DAY_END_OPTIONS, formatDayEndHour, useDayEnd, type DayEndHour } from '$lib/preferences';

	interface Props {
		labelledBy?: string;
	}

	let { labelledBy }: Props = $props();

	const i18n = useI18n();
	const dayEnd = useDayEnd();

	function setHour(next: DayEndHour): void {
		if (dayEnd.hour === next) return;
		dayEnd.setHour(next);
		track('day_end_changed', { hour: next });
	}

	function handleChange(event: Event): void {
		const value = Number((event.currentTarget as HTMLSelectElement).value) as DayEndHour;
		setHour(value);
	}
</script>

<select
	class="day-end-select"
	aria-label={labelledBy ? undefined : i18n.t('dayEnd.label')}
	aria-labelledby={labelledBy}
	value={dayEnd.hour}
	onchange={handleChange}
>
	{#each DAY_END_OPTIONS as option}
		<option value={option}>{formatDayEndHour(option)}</option>
	{/each}
</select>

<style>
	.day-end-select {
		appearance: none;
		box-sizing: border-box;
		min-height: var(--size-touch);
		min-width: 5.75rem;
		padding: 0 calc(var(--space-4) + var(--space-2)) 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--fill-subtle);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238a8275'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.45rem center;
		background-size: 1rem;
		color: var(--text);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 500;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		cursor: pointer;
		transition:
			border-color var(--transition-interactive),
			color var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.day-end-select:hover,
	.day-end-select:focus-visible {
		border-color: var(--accent-dim);
		outline: none;
	}
</style>
