<script lang="ts">
	import { onMount } from 'svelte';
	import { AppIcon } from '$lib/icons';
	import { localDateKey } from '$lib/events/grouping';
	import { useI18n } from '$lib/i18n';
	import { useDayEnd } from '$lib/preferences';
	import { eventStore } from '$lib/state/events.svelte';
	import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
	import { track } from '$lib/analytics';
	import { hapticLight } from '$lib/platform/native';
	import {
		createGestureState,
		HORIZONTAL_DOMINANCE,
		LEFT_EDGE_BACK_PX,
		SWIPE_COMMIT_PX,
		type GestureState
	} from '$lib/navigation/panel-gestures';
	import { patchNavigationHost } from '$lib/navigation/navigation-host.svelte';
	import ArchivePopup from '$lib/components/ArchivePopup.svelte';
	import ProfileDrawerContent from './ProfileDrawerContent.svelte';

	const i18n = useI18n();
	const dayEnd = useDayEnd();
	const entries = $derived(eventStore.entries);

	let open = $state(false);
	let archiveOpen = $state(false);
	let dragPx = $state(0);
	let drawerWidth = $state(0);
	let gesture = $state<GestureState | null>(null);
	let drawerEl = $state<HTMLElement | null>(null);
	let edgeEl = $state<HTMLElement | null>(null);

	const fullyClosed = $derived(!open && dragPx === 0);
	const isInteractive = $derived(open || dragPx > 0);

	const drawerTransform = $derived.by(() => {
		if (fullyClosed) return 'translateX(-100%)';
		if (open) {
			const offset = Math.min(0, dragPx);
			return offset === 0 ? 'translateX(0)' : `translateX(${offset}px)`;
		}
		const w = drawerWidth > 0 ? drawerWidth : 320;
		return `translateX(${-w + dragPx}px)`;
	});

	export function openDrawer(): void {
		open = true;
		track('profile_opened');
		void hapticLight();
	}

	export function closeDrawer(): void {
		archiveOpen = false;
		open = false;
		dragPx = 0;
	}

	export function isOpen(): boolean {
		return open;
	}

	onMount(() =>
		patchNavigationHost({
			isProfileOpen: () => open,
			closeProfile: () => {
				if (!open) return false;
				closeDrawer();
				return true;
			}
		})
	);

	$effect(() => {
		if (!drawerEl) return;
		const ro = new ResizeObserver((entries) => {
			drawerWidth = entries[0]?.contentRect.width ?? 0;
		});
		ro.observe(drawerEl);
		return () => ro.disconnect();
	});

	function edgePointerDown(event: PointerEvent): void {
		if (open || event.button !== 0) return;
		if (event.clientX > LEFT_EDGE_BACK_PX + 12) return;
		gesture = createGestureState(event.pointerId, event.clientX, event.clientY);
		edgeEl?.setPointerCapture(event.pointerId);
	}

	function drawerPointerDown(event: PointerEvent): void {
		if (!open || event.button !== 0) return;
		gesture = createGestureState(event.pointerId, event.clientX, event.clientY);
		drawerEl?.setPointerCapture(event.pointerId);
	}

	function pointerMove(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const dx = event.clientX - gesture.startX;
		const dy = event.clientY - gesture.startY;
		if (!gesture.locked) {
			if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
			if (Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_DOMINANCE) return;
			gesture.locked = true;
		}

		if (open) {
			dragPx = Math.min(0, dx);
		} else if (dx > 0) {
			dragPx = Math.min(dx, drawerWidth || 320);
		}
	}

	function pointerEnd(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const dx = event.clientX - gesture.startX;
		gesture = null;

		if (open) {
			if (dx < -SWIPE_COMMIT_PX * 0.5) closeDrawer();
			dragPx = 0;
			return;
		}

		if (dx > SWIPE_COMMIT_PX * 0.45 || dx > (drawerWidth || 320) * 0.35) {
			openDrawer();
		}
		dragPx = 0;
	}

	function pointerCancel(event: PointerEvent): void {
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		gesture = null;
		dragPx = 0;
	}

	function openArchive(): void {
		track('archive_opened');
		archiveOpen = true;
	}
</script>

<div
	class="profile-edge"
	bind:this={edgeEl}
	aria-hidden="true"
	onpointerdown={edgePointerDown}
	onpointermove={pointerMove}
	onpointerup={pointerEnd}
	onpointercancel={pointerCancel}
></div>

{#if open || dragPx > 0}
	<button
		type="button"
		class="profile-backdrop"
		class:profile-backdrop--visible={open}
		aria-label={i18n.t('common.close')}
		onclick={closeDrawer}
	></button>
{/if}

<aside
	bind:this={drawerEl}
	class="profile-drawer"
	class:profile-drawer--interactive={isInteractive}
	class:profile-drawer--dragging={gesture !== null}
	style:transform={drawerTransform}
	aria-hidden={fullyClosed}
	inert={fullyClosed}
	onpointerdown={drawerPointerDown}
	onpointermove={pointerMove}
	onpointerup={pointerEnd}
	onpointercancel={pointerCancel}
>
	<header class="profile-drawer__head">
		<h2 id="profile-drawer-title" class="profile-drawer__title">{i18n.t('profile.title')}</h2>
		<button type="button" class="profile-drawer__close" onclick={closeDrawer}>
			{i18n.t('common.close')}
		</button>
	</header>

	<div class="profile-drawer__body">
		<ProfileDrawerContent onOpenArchive={openArchive} />
	</div>
</aside>

<ArchivePopup
	open={archiveOpen}
	{entries}
	onClose={() => (archiveOpen = false)}
	onDelete={async (ids) => {
		const selected = new Set(ids);
		const remainingDayKeys = new Set(
			entries
				.filter((entry) => !selected.has(entry.id))
				.map((entry) => localDateKey(entry.createdAt, dayEnd.hour))
		);
		const emptyDayKeys = [
			...new Set(
				entries
					.filter((entry) => selected.has(entry.id))
					.map((entry) => localDateKey(entry.createdAt, dayEnd.hour))
					.filter((dayKey) => !remainingDayKeys.has(dayKey))
			)
		];

		track('archive_entries_deleted', { count: ids.length });
		await eventStore.deleteByIds(ids);
		await dayReflectionStore.deleteByDayKeys(emptyDayKeys);
	}}
/>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			closeDrawer();
		}
	}}
/>

<style>
	.profile-edge {
		position: fixed;
		top: var(--panel-chrome-inset);
		left: 0;
		bottom: 0;
		z-index: calc(var(--z-profile-drawer) + 1);
		width: 18px;
		pointer-events: auto;
		touch-action: none;
	}

	.profile-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-profile-drawer);
		margin: 0;
		padding: 0;
		border: none;
		background: var(--overlay-scrim);
		opacity: 0;
		pointer-events: none;
		transition: opacity 280ms var(--ease);
	}

	.profile-backdrop--visible {
		opacity: 1;
		pointer-events: auto;
	}

	.profile-drawer {
		position: fixed;
		top: 0;
		left: 0;
		z-index: calc(var(--z-profile-drawer) + 2);
		display: flex;
		flex-direction: column;
		width: min(88vw, 20rem);
		height: 100dvh;
		max-height: 100dvh;
		background: var(--bg-elevated);
		border-right: 1px solid var(--border);
		box-shadow: var(--shadow-chrome);
		padding: calc(var(--space-4) + env(safe-area-inset-top, 0px))
			calc(var(--space-4) + env(safe-area-inset-right, 0px))
			calc(var(--space-4) + env(safe-area-inset-bottom, 0px))
			calc(var(--space-4) + env(safe-area-inset-left, 0px));
		transform: translateX(-100%);
		pointer-events: none;
		visibility: hidden;
		transition:
			transform 280ms cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0s linear 280ms;
		touch-action: pan-y;
	}

	.profile-drawer--interactive {
		pointer-events: auto;
		visibility: visible;
		transition:
			transform 280ms cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0s;
	}

	.profile-drawer--dragging {
		transition: none;
	}

	.profile-drawer__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.profile-drawer__title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 500;
		color: var(--text);
	}

	.profile-drawer__close {
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--text-muted);
		cursor: pointer;
	}

	.profile-drawer__body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
</style>
