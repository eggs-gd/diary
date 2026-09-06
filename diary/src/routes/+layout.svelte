<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import { track } from '$lib/analytics';
	import { initI18n, useI18n } from '$lib/i18n';
	import { initDayEnd, initReflectionEnabled, initWeekStart } from '$lib/preferences';
	import { initNativePlatform, teardownNativePlatform } from '$lib/platform/native';
	import { handleAppBack } from '$lib/navigation/navigation-host.svelte';
	import { authStore } from '$lib/state/auth.svelte';
	import { syncController } from '$lib/sync/controller.svelte';

	let { children } = $props();

	initI18n();
	const i18n = useI18n();
	initWeekStart();
	initDayEnd();
	initReflectionEnabled();

	// Start / stop sync as the user signs in and out.
	$effect(() => {
		const signedIn = !!authStore.user;
		untrack(() => (signedIn ? syncController.start() : syncController.stop()));
	});

	onMount(() => {
		track('app_open');
		authStore.init();
		void initNativePlatform(() => {
			handleAppBack();
		});

		const onVisible = () => {
			if (document.visibilityState === 'visible') syncController.resumeSync();
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			teardownNativePlatform();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{i18n.t('app.title')}</title>
	<meta name="description" content={i18n.t('app.description')} />
	<meta name="application-name" content={i18n.t('app.title')} />
	<meta name="apple-mobile-web-app-title" content={i18n.t('app.title')} />
</svelte:head>

<div class="app">
	<div class="scroll-top-bar">
		<ScrollToTop />
	</div>
	{@render children()}
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
			calc(6.25rem + env(safe-area-inset-bottom, 0px)) 0;
		pointer-events: none;
	}

	.scroll-top-bar :global(.icon-btn) {
		width: 3rem;
		height: 3rem;
		pointer-events: auto;
	}

	.scroll-top-bar :global(.icon-btn svg.app-icon) {
		width: 1.35rem;
		height: 1.35rem;
	}
</style>
