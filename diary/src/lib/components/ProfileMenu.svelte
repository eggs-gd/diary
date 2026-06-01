<script lang="ts">
	import { AppButton, AppPopup, FieldLabel, IconButton } from '$lib/components/ui';
	import { AppIcon } from '$lib/icons';
	import { localDateKey } from '$lib/events/grouping';
	import { useI18n } from '$lib/i18n';
	import { eventStore } from '$lib/state/events.svelte';
	import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
	import { track } from '$lib/analytics';
	import ArchivePopup from './ArchivePopup.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';
	import WeekStartSwitcher from './WeekStartSwitcher.svelte';

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
	onclick={() => {
		profileOpen = true;
		track('profile_opened');
	}}
>
	{#snippet children()}
		<AppIcon name="profile" />
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

		<div class="locale-row">
			<FieldLabel size="row">
				<span id="profile-week-start-heading">{i18n.t('weekStart.label')}</span>
			</FieldLabel>
			<WeekStartSwitcher labelledBy="profile-week-start-heading" />
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
		const selected = new Set(ids);
		const remainingDayKeys = new Set(
			entries.filter((entry) => !selected.has(entry.id)).map((entry) => localDateKey(entry.createdAt))
		);
		const emptyDayKeys = [
			...new Set(
				entries
					.filter((entry) => selected.has(entry.id))
					.map((entry) => localDateKey(entry.createdAt))
					.filter((dayKey) => !remainingDayKeys.has(dayKey))
			)
		];

		track('archive_entries_deleted', { count: ids.length });
		await eventStore.deleteByIds(ids);
		await dayReflectionStore.deleteByDayKeys(emptyDayKeys);
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
