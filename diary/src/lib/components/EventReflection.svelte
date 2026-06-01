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

	type ReflectionView = 'wizard' | 'report';

	let view = $state<ReflectionView>('wizard');
	let openedEntryId = $state<string | null>(null);

	const wizardOpen = $derived(entry !== null && view === 'wizard');
	const reportOpen = $derived(entry !== null && view === 'report');

	function viewForEntry(item: EventEntry): ReflectionView {
		return getReflectionStatus(item) === 'empty' ? 'wizard' : 'report';
	}

	$effect(() => {
		if (!entry) {
			openedEntryId = null;
			view = 'wizard';
			return;
		}

		if (entry.id !== openedEntryId) {
			openedEntryId = entry.id;
			view = viewForEntry(entry);
		}
	});

	function dismiss(): void {
		entry = null;
	}

	async function persist(updated: EventEntry): Promise<void> {
		await eventStore.update(updated);
		entry = updated;
	}

	async function complete(updated: EventEntry): Promise<void> {
		await persist(updated);

		const status = getReflectionStatus(updated);
		if (status === 'empty') {
			void hapticLight();
			dismiss();
			return;
		}

		if (status === 'complete') {
			track('reflection_saved', {
				score: updated.protocol?.reflectionScore ?? updated.score
			});
		}

		void hapticLight();
		view = 'report';
	}
</script>

<ReflectionEvent
	open={wizardOpen}
	{entry}
	onClose={dismiss}
	onPersist={persist}
	onComplete={complete}
/>

<ReflectionReport
	open={reportOpen}
	{entry}
	onClose={dismiss}
	onPersist={persist}
/>
