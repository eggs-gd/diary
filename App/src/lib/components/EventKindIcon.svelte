<script lang="ts">
	import { AppIcon } from '$lib/icons';
	import { EVENT_KIND_ICON, type EventKind } from '$lib/events/event-kind';

	interface Props {
		kind: EventKind;
	}

	let { kind }: Props = $props();
</script>

<AppIcon name={EVENT_KIND_ICON[kind]} class="event-kind-icon" />

<style>
	:global(svg.event-kind-icon) {
		width: 1em;
		height: 1em;
	}
</style>
