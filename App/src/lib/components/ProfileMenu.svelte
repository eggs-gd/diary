<script lang="ts">
	import { ChromeRoundButton } from '$lib/components/chrome';
	import { useI18n } from '$lib/i18n';
	import ProfileDrawer from '$lib/components/navigation/ProfileDrawer.svelte';

	const i18n = useI18n();

	let drawer = $state<ProfileDrawer | null>(null);
</script>

<ChromeRoundButton
	icon="menu"
	label={i18n.t('profile.open')}
	expanded={drawer?.isOpen() ?? false}
	onclick={() => drawer?.openDrawer()}
/>

<ProfileDrawer bind:this={drawer} />
