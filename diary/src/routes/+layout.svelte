<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import { track } from '$lib/analytics';
	import { initI18n, useI18n } from '$lib/i18n';
	import { initWeekStart } from '$lib/preferences';
	import { initNativePlatform, teardownNativePlatform } from '$lib/platform/native';

	let { children } = $props();

	initI18n();
	const i18n = useI18n();
	initWeekStart();

	onMount(() => {
		track('app_open');
		void initNativePlatform(() => {
			if (typeof history !== 'undefined' && history.length > 1) {
				history.back();
			}
		});
		return () => teardownNativePlatform();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{i18n.t('app.title')}</title>
	<meta name="description" content={i18n.t('app.description')} />
</svelte:head>

<div class="app">
	<div class="scroll-top-bar">
		<ScrollToTop />
	</div>
	{@render children()}
	<div class="profile-bar">
		<ProfileMenu />
	</div>
</div>

<style>
	.app {
		position: relative;
		z-index: 1;
		min-height: 100dvh;
		width: 100%;
		max-width: 100%;
		overflow-x: hidden;
	}

	.scroll-top-bar {
		position: fixed;
		right: 0;
		bottom: 0;
		z-index: var(--z-chrome);
		display: flex;
		justify-content: flex-end;
		padding: 0 calc(0.75rem + env(safe-area-inset-right, 0px))
			calc(0.75rem + env(safe-area-inset-bottom, 0px)) 0;
		pointer-events: none;
	}

	.scroll-top-bar :global(.scroll-top-btn) {
		pointer-events: auto;
	}

	.profile-bar {
		position: fixed;
		top: 0;
		left: 0;
		z-index: var(--z-chrome);
		display: flex;
		justify-content: flex-start;
		padding: calc(var(--space-3) + env(safe-area-inset-top, 0px)) 0 0
			calc(var(--space-3) + env(safe-area-inset-left, 0px));
		pointer-events: auto;
	}
</style>
