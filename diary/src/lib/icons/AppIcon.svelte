<script lang="ts">
	import { ICONS, type IconName } from './registry';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		name: IconName;
		class?: ClassValue;
		size?: number | string;
		strokeWidth?: number;
	}

	let { name, class: className = '', size, strokeWidth = 1.75 }: Props = $props();

	const Icon = $derived(ICONS[name]);
</script>

<Icon class={['app-icon', className]} {size} {strokeWidth} color="currentColor" aria-hidden="true" />

<style>
	:global(svg.app-icon) {
		display: block;
		flex-shrink: 0;
	}
</style>
