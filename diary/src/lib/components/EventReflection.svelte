<script lang="ts">
	import ReflectionEvent from '$lib/components/ReflectionEvent.svelte';
	import ReflectionReport from '$lib/components/ReflectionReport.svelte';
	import type { EventEntry } from '$lib/events/types';
	import { getReflectionStatus, protocolFilledCount } from '$lib/events/reflection-status';
	import { hapticLight } from '$lib/platform/native';
	import { eventStore } from '$lib/state/events.svelte';
	import { track } from '$lib/analytics';

	type EventReflectionSource = 'archive' | 'day_reflection';

	interface Props {
		entry: EventEntry | null;
		source?: EventReflectionSource;
	}

	let { entry = $bindable(null), source = 'archive' }: Props = $props();

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
			track('reflection_opened', {
				source,
				mode: view,
				status: getReflectionStatus(entry),
				score: entry.score,
				filledFields: protocolFilledCount(entry.protocol)
			});
		}
	});

	function dismiss(): void {
		if (entry) {
			track('reflection_closed', {
				source,
				mode: view,
				status: getReflectionStatus(entry),
				filledFields: protocolFilledCount(entry.protocol)
			});
		}
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
			track('reflection_quiz_saved', {
				source,
				status,
				score: updated.protocol?.reflectionScore ?? updated.score,
				filledFields: protocolFilledCount(updated.protocol),
				complete: false
			});
			void hapticLight();
			dismiss();
			return;
		}

		track('reflection_quiz_saved', {
			source,
			status,
			score: updated.protocol?.reflectionScore ?? updated.score,
			filledFields: protocolFilledCount(updated.protocol),
			complete: status === 'complete'
		});

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
	{source}
	onClose={dismiss}
	onPersist={persist}
/>
