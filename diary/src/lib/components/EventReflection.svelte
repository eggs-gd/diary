<script lang="ts">
	import ReflectionEvent from '$lib/components/ReflectionEvent.svelte';
	import ReflectionReport from '$lib/components/ReflectionReport.svelte';
	import type { EventEntry } from '$lib/events/types';
	import { getReflectionStatus } from '$lib/events/reflection-status';
	import { hapticLight } from '$lib/platform/native';
	import { eventStore } from '$lib/state/events.svelte';
	import { track } from '$lib/analytics';

	interface Props {
		entry: EventEntry | null;
	}

	let { entry = $bindable(null) }: Props = $props();

	const reportOpen = $derived(entry !== null && getReflectionStatus(entry) === 'complete');
	const wizardOpen = $derived(entry !== null && getReflectionStatus(entry) !== 'complete');

	async function persist(updated: EventEntry): Promise<void> {
		await eventStore.update(updated);
		entry = updated;
	}

	async function complete(updated: EventEntry): Promise<void> {
		await eventStore.update(updated);
		track('reflection_saved', {
			score: updated.protocol?.reflectionScore ?? updated.score
		});
		void hapticLight();
		entry = null;
	}
</script>

<ReflectionEvent
	open={wizardOpen}
	{entry}
	onClose={() => (entry = null)}
	onPersist={persist}
	onComplete={complete}
/>

<ReflectionReport
	open={reportOpen}
	{entry}
	onClose={() => (entry = null)}
	onPersist={persist}
/>
