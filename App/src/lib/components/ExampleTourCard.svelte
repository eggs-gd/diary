<script lang="ts">
	import { AppButton } from '$lib/components/ui';
	import { useI18n } from '$lib/i18n';

	interface Props {
		reflectionOn: boolean;
		onShowReflection: () => void;
		onRemove: () => void;
	}

	let { reflectionOn, onShowReflection, onRemove }: Props = $props();

	const i18n = useI18n();
</script>

<aside class="tour" aria-label={i18n.t('tour.title')}>
	<h3>{i18n.t('tour.title')}</h3>
	<p>{i18n.t(reflectionOn ? 'tour.reflectionOn' : 'tour.simple')}</p>
	<div class="tour-actions">
		{#if !reflectionOn}
			<AppButton variant="primary" onclick={onShowReflection}>{i18n.t('tour.show')}</AppButton>
		{/if}
		<AppButton variant="secondary" onclick={onRemove}>{i18n.t('tour.remove')}</AppButton>
	</div>
</aside>

<style>
	.tour {
		margin: var(--space-4) 0;
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-elevated);
	}

	h3 {
		margin: 0 0 var(--space-2);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text);
	}

	p {
		margin: 0 0 var(--space-3);
		font-size: var(--text-base);
		line-height: var(--leading-normal);
		color: var(--text-muted);
	}

	.tour-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
