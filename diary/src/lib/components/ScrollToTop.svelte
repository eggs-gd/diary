<script lang="ts">
	import { onMount } from 'svelte';
	import { IconButton } from '$lib/components/ui';
	import { useI18n } from '$lib/i18n';

	const SHOW_AFTER_PX = 320;
	const i18n = useI18n();

	let visible = $state(false);

	onMount(() => {
		const onScroll = () => {
			visible = window.scrollY > SHOW_AFTER_PX;
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollToTop(): void {
		window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
	}
</script>

<IconButton label={i18n.t('app.scrollToTop')} {visible} onclick={scrollToTop}>
	{#snippet children()}
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 6.5 6 14h4.5v3.5h3V14H18L12 6.5z" />
		</svg>
	{/snippet}
</IconButton>
