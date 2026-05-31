<script lang="ts">
	import { tick } from 'svelte';
	import { AppFullscreen } from '$lib/components/ui';
	import {
		addMonths,
		buildMonthCells,
		calendarMonthBounds,
		calendarYearBounds,
		clampCalendarMonth,
		compareMonths,
		entryCountsByDay,
		iterMonthKeys,
		monthKey,
		monthSelectOptions,
		parseMonthKey,
		todayKey,
		weekdayLabels
	} from '$lib/events/calendar';
	import type { CalendarCell } from '$lib/events/calendar';
	import { reflectionCalendarStateByDay } from '$lib/events/day-reflection';
	import { medianEventScoreByMonth } from '$lib/events/period-score';
	import type { DayReflection, EventEntry } from '$lib/events/types';
	import ScoreDots from '$lib/components/ScoreDots.svelte';
	import { AppIcon } from '$lib/icons';
	import { useI18n } from '$lib/i18n';
	import { resolveWeekStart } from '$lib/preferences/week-start';
	import { useWeekStart } from '$lib/preferences';
	import { hapticLight } from '$lib/platform/native';

	interface Props {
		open: boolean;
		entries: EventEntry[];
		dayReflections: DayReflection[];
		resetView?: boolean;
		onClose: () => void;
		onSelectDay: (dayKey: string) => void;
	}

	let {
		open,
		entries,
		dayReflections,
		resetView = true,
		onClose,
		onSelectDay
	}: Props = $props();

	const INITIAL_PAST = 2;
	const INITIAL_FUTURE = 2;
	const EXTEND_BY = 3;
	const MAX_MONTHS = 120;

	const i18n = useI18n();
	const weekStart = useWeekStart();
	const weekStartPreference = $derived.by(() => weekStart.preference);
	const resolvedWeekStart = $derived.by(() => resolveWeekStart(weekStartPreference, i18n.locale));

	const entryDates = $derived(entries.map((entry) => entry.createdAt));
	const countsByDay = $derived(entryCountsByDay(entryDates));
	const monthScores = $derived(medianEventScoreByMonth(entries));
	const reflectionStateMap = $derived(reflectionCalendarStateByDay(dayReflections));
	const weekdays = $derived.by(() => weekdayLabels(i18n.locale, resolvedWeekStart));
	const monthOptions = $derived(monthSelectOptions(i18n.locale));
	const yearBounds = $derived(calendarYearBounds(entryDates));
	const monthBounds = $derived(calendarMonthBounds(entryDates));
	const yearOptions = $derived(
		Array.from(
			{ length: yearBounds.max - yearBounds.min + 1 },
			(_, index) => yearBounds.min + index
		)
	);
	const today = todayKey();

	let calendarRoot = $state<HTMLElement | null>(null);
	let topSentinel = $state<HTMLElement | null>(null);
	let bottomSentinel = $state<HTMLElement | null>(null);
	let rangeStart = $state({ year: new Date().getFullYear(), month: new Date().getMonth() });
	let rangeEnd = $state({ year: new Date().getFullYear(), month: new Date().getMonth() });
	let headerYear = $state(new Date().getFullYear());
	let headerMonth = $state(new Date().getMonth());
	let syncingFromScroll = $state(false);
	let wasOpen = $state(false);
	let scrollSyncFrame: number | null = null;

	const monthKeys = $derived(iterMonthKeys(rangeStart, rangeEnd));

	function getScrollContainer(): HTMLElement | null {
		return calendarRoot?.closest('.shell-body') ?? null;
	}

	function resetCalendarView(): void {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();

		headerYear = year;
		headerMonth = month;

		rangeStart = clampCalendarMonth(addMonths(year, month, -INITIAL_PAST), monthBounds);
		rangeEnd = clampCalendarMonth(addMonths(year, month, INITIAL_FUTURE), monthBounds);
	}

	function extendRangeStart(delta: number): boolean {
		if (compareMonths(rangeStart, monthBounds.start) <= 0) return false;

		let nextStart = addMonths(rangeStart.year, rangeStart.month, delta);
		if (compareMonths(nextStart, monthBounds.start) < 0) {
			nextStart = monthBounds.start;
		}
		if (compareMonths(nextStart, rangeStart) >= 0) return false;

		rangeStart = nextStart;
		return true;
	}

	function extendRangeEnd(delta: number): boolean {
		if (compareMonths(rangeEnd, monthBounds.end) >= 0) return false;

		let nextEnd = addMonths(rangeEnd.year, rangeEnd.month, delta);
		if (compareMonths(nextEnd, monthBounds.end) > 0) {
			nextEnd = monthBounds.end;
		}
		if (compareMonths(nextEnd, rangeEnd) <= 0) return false;

		rangeEnd = nextEnd;
		return true;
	}

	function scrollToMonthKey(key: string, behavior: ScrollBehavior = 'smooth'): void {
		const section = calendarRoot?.querySelector<HTMLElement>(`[data-month-key="${key}"]`);
		section?.scrollIntoView({ behavior, block: 'start' });
	}

	function ensureMonthInRange(year: number, month: number): void {
		const target = clampCalendarMonth({ year, month }, monthBounds);
		let guard = 0;

		while (guard < 20) {
			guard += 1;

			if (compareMonths(target, rangeStart) < 0) {
				if (!extendRangeStart(-EXTEND_BY)) break;
			} else if (compareMonths(target, rangeEnd) > 0) {
				if (!extendRangeEnd(EXTEND_BY)) break;
			} else {
				break;
			}
		}
	}

	async function extendPast(): Promise<void> {
		if (monthKeys.length >= MAX_MONTHS) return;

		const scrollContainer = getScrollContainer();
		const prevHeight = scrollContainer?.scrollHeight ?? 0;
		const prevTop = scrollContainer?.scrollTop ?? 0;

		if (!extendRangeStart(-EXTEND_BY)) return;
		await tick();

		if (scrollContainer) {
			scrollContainer.scrollTop = prevTop + (scrollContainer.scrollHeight - prevHeight);
		}
	}

	function extendFuture(): void {
		if (monthKeys.length >= MAX_MONTHS) return;
		extendRangeEnd(EXTEND_BY);
	}

	function syncHeaderFromScroll(): void {
		if (syncingFromScroll) return;

		const scrollContainer = getScrollContainer();
		if (!scrollContainer || !calendarRoot) return;

		const marker = scrollContainer.getBoundingClientRect().top + 72;
		const sections = calendarRoot.querySelectorAll<HTMLElement>('[data-month-key]');
		let activeKey: string | null = null;

		for (const section of sections) {
			const { top, bottom } = section.getBoundingClientRect();
			if (top <= marker && bottom > marker) {
				activeKey = section.dataset.monthKey ?? null;
				break;
			}
		}

		if (!activeKey) {
			for (const section of sections) {
				if (section.getBoundingClientRect().top >= marker) {
					activeKey = section.dataset.monthKey ?? null;
					break;
				}
			}
		}

		if (!activeKey) return;

		const parsed = parseMonthKey(activeKey);
		headerYear = parsed.year;
		headerMonth = parsed.month;
	}

	function queueHeaderSyncFromScroll(): void {
		if (scrollSyncFrame !== null) return;
		scrollSyncFrame = requestAnimationFrame(() => {
			scrollSyncFrame = null;
			syncHeaderFromScroll();
		});
	}

	async function jumpToHeaderMonth(): Promise<void> {
		syncingFromScroll = true;
		ensureMonthInRange(headerYear, headerMonth);
		await tick();
		scrollToMonthKey(monthKey(headerYear, headerMonth));
		void hapticLight();
		window.setTimeout(() => {
			syncingFromScroll = false;
		}, 400);
	}

	async function jumpToToday(): Promise<void> {
		const now = new Date();
		headerYear = now.getFullYear();
		headerMonth = now.getMonth();
		await jumpToHeaderMonth();
	}

	function selectDay(cell: CalendarCell): void {
		if (cell.count === 0) return;
		onSelectDay(cell.key);
		void hapticLight();
	}

	function monthCells(key: string): CalendarCell[] {
		const { year, month } = parseMonthKey(key);
		return buildMonthCells(
			year,
			month,
			countsByDay,
			today,
			resolvedWeekStart,
			reflectionStateMap
		);
	}

	function dayAriaLabel(cell: CalendarCell): string {
		if (cell.count === 0) return String(cell.day);
		if (cell.reflectionStatus === 'complete') {
			return i18n.t('archive.dayReflectionComplete', { day: cell.day, count: cell.count });
		}
		if (cell.reflectionStatus === 'partial') {
			return i18n.t('archive.dayReflectionPartial', { day: cell.day, count: cell.count });
		}
		return i18n.t('archive.dayReflectionNotStarted', { day: cell.day, count: cell.count });
	}

	function releaseHeaderFocus(): void {
		const active = document.activeElement;
		if (active instanceof HTMLElement && active.closest('.calendar-head')) {
			active.blur();
		}
	}

	$effect(() => {
		if (!open) {
			wasOpen = false;
			return;
		}

		const justOpened = !wasOpen;
		wasOpen = true;

		if (justOpened && resetView) {
			resetCalendarView();
		}

		if (!justOpened) return;

		void tick().then(() => {
			if (resetView) {
				scrollToMonthKey(monthKey(headerYear, headerMonth), 'auto');
			}
			releaseHeaderFocus();
			requestAnimationFrame(releaseHeaderFocus);
		});
	});

	$effect(() => {
		if (!open || !calendarRoot) return;

		const scrollContainer = getScrollContainer();
		if (!scrollContainer) return;

		const handleScroll = () => queueHeaderSyncFromScroll();
		scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			scrollContainer.removeEventListener('scroll', handleScroll);
			if (scrollSyncFrame !== null) {
				cancelAnimationFrame(scrollSyncFrame);
				scrollSyncFrame = null;
			}
		};
	});

	$effect(() => {
		if (!open || !topSentinel || !bottomSentinel) return;

		const scrollContainer = getScrollContainer();
		if (!scrollContainer) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					if (entry.target === topSentinel) void extendPast();
					if (entry.target === bottomSentinel) extendFuture();
				}
			},
			{ root: scrollContainer, rootMargin: '120px 0px' }
		);

		observer.observe(topSentinel);
		observer.observe(bottomSentinel);
		return () => observer.disconnect();
	});
</script>

{#snippet header()}
	<div class="calendar-head">
		<button type="button" class="calendar-back" onclick={onClose}>
			{i18n.t('analysis.back')}
		</button>

		<h1 id="archive-calendar-title" class="calendar-title-sr">{i18n.t('archive.openCalendar')}</h1>

		<div class="calendar-head-row">
			<div class="calendar-head-pickers">
				<select
					class="calendar-select calendar-select--month"
					aria-label={i18n.t('archive.selectMonth')}
					bind:value={headerMonth}
					onchange={jumpToHeaderMonth}
				>
					{#each monthOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>

				<select
					class="calendar-select calendar-select--year"
					aria-label={i18n.t('archive.selectYear')}
					bind:value={headerYear}
					onchange={jumpToHeaderMonth}
				>
					{#each yearOptions as year}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>

			<button type="button" class="calendar-today-btn" onclick={jumpToToday}>
				{i18n.t('archive.today')}
			</button>
		</div>
	</div>
{/snippet}

<AppFullscreen {open} labelledBy="archive-calendar-title" showClose={false} {onClose} {header}>
	{#snippet children()}
		<div class="calendar" bind:this={calendarRoot}>
			<div class="calendar-weekdays" aria-hidden="true">
				{#each weekdays as label, index (`${resolvedWeekStart}-${index}`)}
					<span class="calendar-weekday">{label}</span>
				{/each}
			</div>

			<div class="calendar-months">
				<div class="calendar-sentinel" bind:this={topSentinel} aria-hidden="true"></div>

				{#each monthKeys as key (key)}
					{@const parsed = parseMonthKey(key)}
					{@const monthScore = monthScores.get(key)}
					{@const monthName =
						monthOptions.find((option) => option.value === parsed.month)?.label ?? ''}
					<section
						class="calendar-month"
						data-month-key={key}
						aria-labelledby="calendar-month-{key}"
					>
						<div class="calendar-month-head">
							<div class="calendar-month-title">
								<h2 class="calendar-month-name" id="calendar-month-{key}">{monthName}</h2>
								{#if monthScore !== undefined}
									<ScoreDots compact original={monthScore} />
								{/if}
							</div>
							<p class="calendar-month-year">{parsed.year}</p>
						</div>

						<div class="calendar-grid" role="grid">
							{#each monthCells(key) as cell (cell.key)}
								{#if cell.inMonth}
									<button
										type="button"
										class="calendar-day"
										class:calendar-day--today={cell.isToday}
										class:calendar-day--has-entries={cell.count > 0}
										class:calendar-day--reflection-complete={cell.reflectionStatus === 'complete'}
										class:calendar-day--reflection-partial={cell.reflectionStatus === 'partial'}
										class:calendar-day--reflection-not-started={cell.reflectionStatus === 'not_started'}
										disabled={cell.count === 0}
										aria-label={dayAriaLabel(cell)}
										onclick={() => selectDay(cell)}
									>
										<span class="calendar-day__num">{cell.day}</span>
										{#if cell.reflectionStatus === 'complete'}
											<span class="calendar-day__check calendar-day__check--complete" aria-hidden="true">
												<AppIcon name="check" />
											</span>
										{:else if cell.reflectionStatus === 'partial'}
											<span class="calendar-day__check calendar-day__check--partial" aria-hidden="true">
												<AppIcon name="check" />
											</span>
										{:else if cell.reflectionStatus === 'not_started'}
											<span class="calendar-day__mark" aria-hidden="true"></span>
										{/if}
									</button>
								{:else}
									<span class="calendar-day-pad" aria-hidden="true"></span>
								{/if}
							{/each}
						</div>
					</section>
				{/each}

				<div class="calendar-sentinel" bind:this={bottomSentinel} aria-hidden="true"></div>
			</div>
		</div>
	{/snippet}
</AppFullscreen>

<style>
	.calendar-head {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		width: 100%;
		min-width: 0;
	}

	.calendar-back {
		align-self: flex-start;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 0.75em;
		font-weight: 400;
		line-height: var(--leading-normal);
		color: var(--text-muted);
		cursor: pointer;
		transition: color var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.calendar-back:hover,
	.calendar-back:focus-visible {
		color: var(--text-soft);
		outline: none;
	}

	.calendar-title-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.calendar-head-row {
		display: flex;
		align-items: stretch;
		gap: 0.5em;
		width: 100%;
		min-width: 0;
		--calendar-head-control-height: 2.25rem;
	}

	.calendar-head-pickers {
		display: flex;
		flex: 0 0 auto;
		align-items: stretch;
		gap: 0.5em;
		min-width: 0;
	}

	.calendar-select {
		appearance: none;
		box-sizing: border-box;
		height: var(--calendar-head-control-height);
		min-height: var(--calendar-head-control-height);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--fill-subtle);
		color: var(--text);
		font-family: var(--font-serif);
		font-size: 1.125em;
		font-weight: 400;
		line-height: var(--leading-tight);
		padding: 0 calc(1em + 0.75rem) 0 0.75em;
		cursor: pointer;
		transition: var(--transition-interactive);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238a8275'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.35em center;
		background-size: 1em;
		text-transform: capitalize;
	}

	.calendar-select--month {
		flex: 0 1 auto;
		width: auto;
		max-width: 11em;
		min-width: 0;
	}

	.calendar-select--year {
		flex: 0 0 auto;
		width: 5.5em;
		min-width: 0;
		font-variant-numeric: tabular-nums;
	}

	.calendar-today-btn {
		box-sizing: border-box;
		height: var(--calendar-head-control-height);
		min-height: var(--calendar-head-control-height);
		margin-left: auto;
		flex: 0 0 auto;
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 1em;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--fill-subtle);
		color: var(--text-muted);
		font-family: var(--font-sans);
		font-size: 0.75em;
		font-weight: 500;
		line-height: 1;
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
		white-space: nowrap;
	}

	.calendar-today-btn:hover,
	.calendar-today-btn:focus-visible {
		border-color: var(--accent-dim);
		color: var(--text);
		outline: none;
	}

	.calendar-select:hover,
	.calendar-select:focus-visible {
		border-color: var(--accent-dim);
		outline: none;
	}

	.calendar {
		display: grid;
		gap: var(--space-3);
		max-width: var(--content-max-width);
		margin: 0 auto;
		width: 100%;
	}

	.calendar-weekdays {
		position: sticky;
		top: 0;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--space-1);
		padding-bottom: var(--space-2);
		background: var(--bg);
	}

	.calendar-weekday {
		text-align: center;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-caps);
		color: var(--text-faint);
	}

	.calendar-months {
		display: grid;
		gap: var(--space-5);
	}

	.calendar-sentinel {
		height: 1px;
	}

	.calendar-month {
		display: grid;
		gap: var(--space-3);
		scroll-margin-top: 3rem;
	}

	.calendar-month-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.calendar-month-title {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.calendar-month-name {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text-muted);
		text-transform: capitalize;
	}

	.calendar-month-year {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 400;
		font-variant-numeric: tabular-nums;
		color: var(--text-faint);
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--space-1);
	}

	.calendar-day {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		min-height: var(--size-touch);
		padding: 0;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--text-soft);
		cursor: default;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.calendar-day--today {
		box-shadow: inset 0 0 0 1px var(--border);
	}

	.calendar-day-pad {
		display: block;
		aspect-ratio: 1;
		min-height: var(--size-touch);
	}

	.calendar-day--has-entries {
		cursor: pointer;
		color: var(--text);
	}

	.calendar-day--has-entries:hover,
	.calendar-day--has-entries:focus-visible {
		background: var(--fill-subtle);
		outline: none;
	}

	.calendar-day:disabled {
		cursor: default;
	}

	.calendar-day__num {
		font-family: var(--font-serif);
		font-size: var(--text-base);
		line-height: 1;
	}

	.calendar-day__mark {
		position: absolute;
		bottom: 0.4rem;
		left: 50%;
		transform: translateX(-50%);
		width: 0.375rem;
		height: 0.375rem;
		border-radius: var(--radius-full);
		background: var(--accent);
	}

	.calendar-day__check {
		position: absolute;
		bottom: 0.15rem;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		place-items: center;
		font-size: 0.875rem;
		line-height: 1;
		pointer-events: none;
	}

	.calendar-day__check--complete {
		color: var(--accent-leaf);
	}

	.calendar-day__check--partial {
		color: var(--accent);
	}

	.calendar-day__check :global(svg.app-icon) {
		width: 0.9375rem;
		height: 0.9375rem;
	}
</style>
