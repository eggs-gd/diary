<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import ChromeRoundButton from './ChromeRoundButton.svelte';
	import './chrome-layout.css';

	interface Props {
		onBack?: () => void;
		backLabel?: string;
		trailing?: Snippet;
	}

	let { onBack, backLabel, trailing }: Props = $props();

	const i18n = useI18n();
	const resolvedBackLabel = $derived(backLabel ?? i18n.t('analysis.back'));
</script>

<div class="chrome-float-start">
	{#if onBack}
		<ChromeRoundButton icon="chevronLeft" label={resolvedBackLabel} onclick={onBack} />
	{/if}
</div>

<div class="chrome-float-end">
	{#if trailing}
		{@render trailing()}
	{/if}
</div>
