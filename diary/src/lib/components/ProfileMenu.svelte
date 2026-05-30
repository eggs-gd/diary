<script lang="ts">
	import { AppButton, AppPopup, FieldLabel, IconButton } from '$lib/components/ui';
	import { useI18n } from '$lib/i18n';
	import { eventStore } from '$lib/state/events.svelte';
	import { track } from '$lib/analytics';
	import ArchivePopup from './ArchivePopup.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';

	const i18n = useI18n();
	const entries = $derived(eventStore.entries);

	let profileOpen = $state(false);
	let archiveOpen = $state(false);

	function closeProfile(): void {
		archiveOpen = false;
		profileOpen = false;
	}

	function openArchive(): void {
		track('archive_opened');
		archiveOpen = true;
	}

	function closeArchive(): void {
		archiveOpen = false;
	}
</script>

<IconButton
	label={i18n.t('profile.open')}
	expanded={profileOpen}
	haspopup="dialog"
	onclick={() => (profileOpen = true)}
>
	{#snippet children()}
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-3.9 0-7.1 2.2-7.1 5v1.5h14.2V19c0-2.8-3.2-5-7.1-5Z"
			/>
		</svg>
	{/snippet}
</IconButton>

<AppPopup
	open={profileOpen}
	title={i18n.t('profile.title')}
	titleId="profile-popup-title"
	onClose={closeProfile}
>
	{#snippet children()}
		<div class="locale-row">
			<FieldLabel size="row">
				<span id="profile-locale-heading">{i18n.t('locale.label')}</span>
			</FieldLabel>
			<LocaleSwitcher labelledBy="profile-locale-heading" />
		</div>

		<AppButton variant="secondary" fullWidth onclick={openArchive}>
			{i18n.t('profile.clearArchive')}
		</AppButton>
	{/snippet}
</AppPopup>

<ArchivePopup
	open={archiveOpen}
	{entries}
	onClose={closeArchive}
	onDelete={async (ids) => {
		track('archive_entries_deleted', { count: ids.length });
		await eventStore.deleteByIds(ids);
	}}
/>

<style>
	.locale-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
</style>
