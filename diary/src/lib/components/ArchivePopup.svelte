<script lang="ts">
	import type { EventEntry } from '$lib/events/types';
	import { getLocaleDateFormat, useI18n } from '$lib/i18n';
	import { AppButton, AppPopup } from '$lib/components/ui';

	interface Props {
		open: boolean;
		entries: EventEntry[];
		onClose: () => void;
		onDelete: (ids: string[]) => Promise<void>;
	}

	let { open, entries, onClose, onDelete }: Props = $props();

	const i18n = useI18n();
	const dateLocale = $derived(getLocaleDateFormat(i18n.locale));

	let selected = $state<Set<string>>(new Set());
	let deleting = $state(false);

	const selectedCount = $derived(selected.size);
	const allSelected = $derived(entries.length > 0 && selectedCount === entries.length);

	function closeArchive(): void {
		selected = new Set();
		deleting = false;
		onClose();
	}

	$effect(() => {
		if (open) {
			selected = new Set();
			deleting = false;
		}
	});

	function formatEntryTime(iso: string): string {
		return new Date(iso).toLocaleString(dateLocale, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function toggleEntry(id: string): void {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selected = next;
	}

	function toggleAll(): void {
		selected = allSelected ? new Set() : new Set(entries.map((entry) => entry.id));
	}

	async function deleteSelected(): Promise<void> {
		if (selectedCount === 0 || deleting) return;
		deleting = true;
		try {
			await onDelete([...selected]);
			selected = new Set();
		} finally {
			deleting = false;
		}
	}
</script>

<AppPopup
	{open}
	title={i18n.t('profile.archiveTitle')}
	titleId="event-archive-popup"
	bodyClass="event-archive"
	scrollable
	onClose={closeArchive}
>
	{#snippet children()}
		{#if entries.length === 0}
			<p class="event-archive__empty">{i18n.t('profile.archiveEmpty')}</p>
		{:else}
			<AppButton
				variant="text"
				fullWidth
				pressed={allSelected}
				class="event-archive__select-all"
				onclick={toggleAll}
			>
				{i18n.t('profile.selectAll')}
			</AppButton>

			<ul class="event-archive__list">
				{#each entries as entry (entry.id)}
					<li>
						<button
							type="button"
							class="event-archive__entry"
							class:active={selected.has(entry.id)}
							aria-pressed={selected.has(entry.id)}
							onclick={() => toggleEntry(entry.id)}
						>
							<span class="event-archive__head">
								<span
									class="event-archive__text"
									class:event-archive__text--empty={!entry.text.trim()}
								>
									{entry.text.trim() || '-'}
								</span>
								<time class="event-archive__time" datetime={entry.createdAt}>
									{formatEntryTime(entry.createdAt)}
								</time>
							</span>
							<span class="event-archive__meta"
								>{i18n.t('analysis.score', { score: entry.score })}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/snippet}

	{#snippet footer()}
		<AppButton
			variant="danger"
			disabled={selectedCount === 0 || deleting || entries.length === 0}
			onclick={() => void deleteSelected()}
		>
			{i18n.t('profile.deleteSelected', { count: selectedCount })}
		</AppButton>
	{/snippet}
</AppPopup>

<style>
	:global(.event-archive) {
		display: block;
	}

	:global(.event-archive__empty) {
		margin: 0;
		font-size: var(--text-lg);
		color: var(--text-muted);
	}

	:global(.event-archive__select-all) {
		margin-bottom: var(--space-2);
		border-bottom: 1px solid var(--border);
	}

	:global(.event-archive__list) {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	:global(.event-archive__list li) {
		border-bottom: 1px solid var(--border);
	}

	:global(.event-archive__list li:last-child) {
		border-bottom: none;
	}

	:global(.event-archive__entry) {
		width: 100%;
		padding: var(--space-3) 0;
		border: none;
		background: none;
		color: inherit;
		cursor: pointer;
		display: grid;
		gap: var(--space-2);
		text-align: left;
		transition: var(--transition);
		-webkit-tap-highlight-color: transparent;
	}

	:global(.event-archive__entry:hover),
	:global(.event-archive__entry.active) {
		color: var(--text);
	}

	:global(.event-archive__entry.active .event-archive__meta) {
		color: var(--accent);
	}

	:global(.event-archive__entry:focus) {
		outline: none;
	}

	:global(.event-archive__head) {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	:global(.event-archive__text) {
		flex: 1;
		min-width: 0;
		font-size: var(--text-base);
		color: var(--text-soft);
		line-height: var(--leading-tight);
	}

	:global(.event-archive__text--empty) {
		color: var(--text-faint);
	}

	:global(.event-archive__entry.active .event-archive__text) {
		color: var(--text);
	}

	:global(.event-archive__time) {
		flex-shrink: 0;
		font-size: var(--text-sm);
		color: var(--text-faint);
		white-space: nowrap;
	}

	:global(.event-archive__meta) {
		font-family: var(--font-serif);
		font-size: var(--text-sm);
		color: var(--text-muted);
		line-height: 1.3;
	}
</style>
