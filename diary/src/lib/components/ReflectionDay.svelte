<script lang="ts">
	import { AppFullscreen } from '$lib/components/ui';
	import { useI18n } from '$lib/i18n';

	interface Props {
		open: boolean;
		label?: string;
		onClose: () => void;
	}

	let { open, label = '', onClose }: Props = $props();

	const i18n = useI18n();
	const dayLabel = $derived(label.trim() || i18n.t('archive.title'));
</script>

{#snippet header()}
	<div class="day-header">
		<h1 id="reflection-day-title" class="day-header__title">{dayLabel}</h1>
	</div>
{/snippet}

<AppFullscreen
	{open}
	labelledBy="reflection-day-title"
	closeLabel={i18n.t('common.close')}
	{onClose}
	{header}
>
	{#snippet children()}
		<p class="day-stub">{i18n.t('archive.empty')}</p>
	{/snippet}
</AppFullscreen>

<style>
	.day-header {
		min-height: 2.5rem;
	}

	.day-header__title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.day-stub {
		margin: 0;
		font-size: var(--text-base);
		color: var(--text-muted);
	}
</style>
