<script lang="ts">
	import { base } from '$app/paths';
	import ConsentBanner from '$lib/analytics/ConsentBanner.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}

<ConsentBanner privacyHref="{base}/privacy" />
