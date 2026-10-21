<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { AppButton, AppPopup } from '$lib/components/ui';
	import { analyticsConsent } from '$lib/state/analytics-consent.svelte';

	const i18n = useI18n();
</script>

<AppPopup
	open={analyticsConsent.prompt}
	title={i18n.t('analytics.title')}
	titleId="analytics-consent-title"
	closeLabel={i18n.t('analytics.decline')}
	onClose={() => analyticsConsent.decline()}
>
	{#snippet children()}
		<div class="consent-body">
			<p>{i18n.t('analytics.body')}</p>
			<a
				class="consent-privacy"
				href="https://journal.eggs.gd/privacy"
				target="_blank"
				rel="noopener noreferrer"
			>
				{i18n.t('analytics.privacy')}
			</a>
		</div>
	{/snippet}

	{#snippet footer()}
		<AppButton variant="secondary" onclick={() => void analyticsConsent.allow()}>
			{i18n.t('analytics.allow')}
		</AppButton>
	{/snippet}
</AppPopup>

<style>
	.consent-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.consent-body p {
		margin: 0;
		font-size: var(--text-base);
		line-height: var(--leading-normal);
		color: var(--text-muted);
	}

	.consent-privacy {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-decoration: underline;
	}
</style>
