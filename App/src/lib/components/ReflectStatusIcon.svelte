<script lang="ts">
	import { AppIcon, type IconName } from '$lib/icons';

	interface Props {
		name: IconName;
	}

	let { name }: Props = $props();
</script>

<span class="reflect-status-icon" aria-hidden="true">
	<AppIcon {name} />
</span>

<style>
	.reflect-status-icon {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		align-self: center;
		color: var(--text-faint);
	}

	.reflect-status-icon :global(svg.app-icon) {
		width: 1rem;
		height: 1rem;
	}
</style>
