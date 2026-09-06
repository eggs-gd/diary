<script lang="ts">
	import { AppButton, FieldLabel } from '$lib/components/ui';
	import { useI18n } from '$lib/i18n';
	import DayEndSwitcher from '$lib/components/DayEndSwitcher.svelte';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import ReflectionEnabledSwitcher from '$lib/components/ReflectionEnabledSwitcher.svelte';
	import WeekStartSwitcher from '$lib/components/WeekStartSwitcher.svelte';
	import { authStore } from '$lib/state/auth.svelte';
	import { syncController } from '$lib/sync/controller.svelte';

	interface Props {
		onOpenArchive: () => void;
	}

	let { onOpenArchive }: Props = $props();

	const i18n = useI18n();
	const account = $derived(authStore.user?.email ?? authStore.user?.name ?? '');

	const statusLine = $derived.by(() => {
		if (!syncController.enabled) return null;
		switch (syncController.status) {
			case 'syncing':
				return i18n.t('sync.syncing');
			case 'error':
				return i18n.t('sync.error');
			default:
				return syncController.lastSyncedAt
					? i18n.t('sync.lastSynced', { when: relativeTime(syncController.lastSyncedAt) })
					: i18n.t('sync.blurb');
		}
	});

	function relativeTime(ts: number): string {
		const s = Math.round((Date.now() - ts) / 1000);
		if (s < 60) return i18n.t('sync.justNow');
		const m = Math.round(s / 60);
		if (m < 60) return i18n.t('sync.minutesAgo', { n: m });
		const h = Math.round(m / 60);
		if (h < 24) return i18n.t('sync.hoursAgo', { n: h });
		return i18n.t('sync.daysAgo', { n: Math.round(h / 24) });
	}
</script>

<div class="profile-content">
	{#if authStore.available}
		<section class="sync">
			<FieldLabel size="row">
				<span>{i18n.t('sync.label')}</span>
			</FieldLabel>

			{#if authStore.user}
				<p class="sync__account">{i18n.t('sync.signedInAs', { account })}</p>
				{#if statusLine}
					<p class="sync__status">{statusLine}</p>
				{/if}
				<div class="sync__actions">
					<AppButton
						variant="secondary"
						disabled={syncController.status === 'syncing'}
						onclick={() => void syncController.syncNow()}
					>
						{i18n.t('sync.syncNow')}
					</AppButton>
					<AppButton variant="text" onclick={() => void authStore.signOut()}>
						{i18n.t('sync.signOut')}
					</AppButton>
				</div>
			{:else}
				<AppButton
					variant="secondary"
					fullWidth
					disabled={authStore.busy}
					onclick={() => void authStore.signIn()}
				>
					{i18n.t('sync.signIn')}
				</AppButton>
			{/if}

			<a
				class="sync__privacy"
				href="https://journal.eggs.gd/privacy"
				target="_blank"
				rel="noopener noreferrer"
			>
				{i18n.t('sync.privacy')}
			</a>
		</section>
	{/if}

	<div class="locale-row">
		<FieldLabel size="row">
			<span id="profile-locale-heading">{i18n.t('locale.label')}</span>
		</FieldLabel>
		<LocaleSwitcher labelledBy="profile-locale-heading" />
	</div>

	<div class="locale-row">
		<FieldLabel size="row">
			<span id="profile-week-start-heading">{i18n.t('weekStart.label')}</span>
		</FieldLabel>
		<WeekStartSwitcher labelledBy="profile-week-start-heading" />
	</div>

	<div class="locale-row">
		<FieldLabel size="row">
			<span id="profile-day-end-heading">{i18n.t('dayEnd.label')}</span>
		</FieldLabel>
		<DayEndSwitcher labelledBy="profile-day-end-heading" />
	</div>

	<div class="locale-row">
		<FieldLabel size="row">
			<span id="profile-reflection-feature-heading">{i18n.t('reflectionFeature.label')}</span>
		</FieldLabel>
		<ReflectionEnabledSwitcher labelledBy="profile-reflection-feature-heading" />
	</div>

	<AppButton variant="secondary" fullWidth onclick={onOpenArchive}>
		{i18n.t('profile.clearArchive')}
	</AppButton>
</div>

<style>
	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.locale-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.sync {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.sync__account {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text);
		word-break: break-word;
	}

	.sync__status {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.sync__actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.sync__privacy {
		align-self: flex-start;
		font-size: var(--text-xs);
		color: var(--text-faint);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
