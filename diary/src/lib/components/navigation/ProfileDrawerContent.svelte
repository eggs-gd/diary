<script lang="ts">
	import { AppButton, FieldLabel } from '$lib/components/ui';
	import { useI18n } from '$lib/i18n';
	import DayEndSwitcher from '$lib/components/DayEndSwitcher.svelte';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import ReflectionEnabledSwitcher from '$lib/components/ReflectionEnabledSwitcher.svelte';
	import WeekStartSwitcher from '$lib/components/WeekStartSwitcher.svelte';

	interface Props {
		onOpenArchive: () => void;
	}

	let { onOpenArchive }: Props = $props();

	const i18n = useI18n();
</script>

<div class="profile-content">
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
</style>
