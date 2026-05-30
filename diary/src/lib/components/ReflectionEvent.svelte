<script lang="ts">
	import { AppButton, AppFullscreen } from '$lib/components/ui';
	import type { EventEntry, ReflectionProtocol } from '$lib/events/types';
	import { useI18n } from '$lib/i18n';
	import { hapticLight } from '$lib/platform/native';

	interface Props {
		open: boolean;
		entry: EventEntry | null;
		onClose: () => void;
		onPersist: (entry: EventEntry) => Promise<void>;
		onComplete: (entry: EventEntry) => Promise<void>;
	}

	let { open, entry, onClose, onPersist, onComplete }: Props = $props();

	const i18n = useI18n();

	let draft = $state<Pick<ReflectionProtocol, 'event' | 'reason' | 'about' | 'view' | 'actions'>>({
		event: '',
		reason: '',
		about: '',
		view: '',
		actions: ''
	});
	let reflectionScore = $state(0);
	let editingEvent = $state(false);
	let saving = $state(false);
	let stepIndex = $state(0);
	let loadedEntryId = $state<string | null>(null);

	const reflectionRangeFill = $derived(getRangeFill(reflectionScore));
	const protocolFields = ['reason', 'about', 'view', 'actions'] as const;
	const totalSteps = protocolFields.length + 1;
	const isResonanceStep = $derived(stepIndex === protocolFields.length);
	const currentField = $derived(protocolFields[stepIndex] ?? protocolFields[0]);
	const canGoBack = $derived(stepIndex > 0);
	const canGoForward = $derived(stepIndex < totalSteps - 1);

	$effect(() => {
		if (!entry || entry.id === loadedEntryId) return;

		loadedEntryId = entry.id;
		stepIndex = 0;
		editingEvent = false;

		const p = entry.protocol;
		draft = {
			event: p?.event ?? entry.text,
			reason: p?.reason ?? '',
			about: p?.about ?? '',
			view: p?.view ?? '',
			actions: p?.actions ?? ''
		};
		reflectionScore = p?.reflectionScore ?? entry.score;
	});

	$effect(() => {
		if (!open) {
			editingEvent = false;
			loadedEntryId = null;
		}
	});

	function getRangeFill(value: number): string {
		const marker = ((value + 10) / 20) * 100;
		return `linear-gradient(90deg,
			color-mix(in srgb, var(--accent-rose) 58%, transparent) 0%,
			color-mix(in srgb, var(--accent) 42%, transparent) 50%,
			color-mix(in srgb, var(--accent-leaf) 58%, transparent) 100%),
			linear-gradient(90deg, transparent ${marker}%, color-mix(in srgb, var(--bg) 56%, transparent) ${marker}%)`;
	}

	function scoreLabel(value: number): string {
		return value > 0 ? `+${value}` : String(value);
	}

	function reflectionLabel(key: (typeof protocolFields)[number]): string {
		const prefix = (entry?.score ?? 0) <= 0 ? 'negative' : 'positive';
		const map: Record<(typeof protocolFields)[number], string> = {
			reason: i18n.t(`analysis.${prefix}Reason`),
			about: i18n.t(`analysis.${prefix}About`),
			view: i18n.t(`analysis.${prefix}View`),
			actions: i18n.t(`analysis.${prefix}Actions`)
		};
		return map[key];
	}

	function buildEntry(): EventEntry | null {
		if (!entry) return null;
		const protocol: ReflectionProtocol = { ...draft, reflectionScore };
		return { ...entry, text: draft.event.trim() || entry.text, protocol };
	}

	async function persistDraft(): Promise<void> {
		const updated = buildEntry();
		if (!updated || saving) return;
		saving = true;
		try {
			await onPersist(updated);
		} finally {
			saving = false;
		}
	}

	async function goBack(): Promise<void> {
		if (!canGoBack || saving) return;
		await persistDraft();
		stepIndex -= 1;
		void hapticLight();
	}

	async function goForward(): Promise<void> {
		if (!canGoForward || saving) return;
		await persistDraft();
		stepIndex += 1;
		void hapticLight();
	}

	function toggleEventEdit(): void {
		editingEvent = !editingEvent;
		void hapticLight();
	}

	async function completeReflection(): Promise<void> {
		const updated = buildEntry();
		if (!updated || saving) return;
		saving = true;
		try {
			await onPersist(updated);
			await onComplete(updated);
			editingEvent = false;
		} finally {
			saving = false;
		}
	}
</script>

{#snippet header()}
	<div class="event-header">
		{#if editingEvent}
			<textarea
				id="reflection-event-title"
				class="event-header__input"
				bind:value={draft.event}
				rows="2"
				aria-label={i18n.t('capture.event')}
			></textarea>
		{:else}
			<h1 id="reflection-event-title" class="event-header__title">
				{draft.event.trim() || entry?.text || '—'}
			</h1>
		{/if}

		<button
			type="button"
			class="event-header__edit"
			class:active={editingEvent}
			aria-label={i18n.t('analysis.edit')}
			aria-pressed={editingEvent}
			onclick={toggleEventEdit}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5Zm14.7-8.8a1 1 0 0 0 0-1.4l-1-1a1 1 0 0 0-1.4 0l-1 1 2.4 2.4 1-1Z"
				/>
			</svg>
		</button>
	</div>
{/snippet}

<AppFullscreen
	{open}
	labelledBy="reflection-event-title"
	closeLabel={i18n.t('common.close')}
	{onClose}
	{header}
>
	{#snippet children()}
		{#if entry}
			<div class="reflection">
				<section class="quiz-step" aria-live="polite">
					{#if isResonanceStep}
						<h2 class="quiz-question">{i18n.t('analysis.resonanceQuestion')}</h2>
						<div class="rf-resonance">
							<div class="rf-score-row">
								<p
									class="rf-score-value"
									class:positive={reflectionScore > 0}
									class:negative={reflectionScore <= 0}
								>{scoreLabel(reflectionScore)}</p>
							</div>
							<input
								type="range"
								min="-10"
								max="10"
								step="1"
								bind:value={reflectionScore}
								style:--range-fill={reflectionRangeFill}
							/>
							<div class="scale-labels" aria-hidden="true">
								<span>-10</span>
								<span>0</span>
								<span>+10</span>
							</div>
						</div>
					{:else}
						<h2 class="quiz-question">{reflectionLabel(currentField)}</h2>
						<textarea
							class="quiz-input"
							bind:value={draft[currentField]}
							rows="6"
							placeholder={reflectionLabel(currentField)}
							aria-label={reflectionLabel(currentField)}
						></textarea>
					{/if}
				</section>

				<nav class="quiz-nav" aria-label={i18n.t('analysis.title')}>
					<button
						type="button"
						class="quiz-arrow"
						disabled={!canGoBack || saving}
						aria-label={i18n.t('analysis.prev')}
						onclick={() => void goBack()}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41Z" />
						</svg>
					</button>

					{#if isResonanceStep}
						<AppButton
							variant="primary"
							disabled={saving}
							onclick={() => void completeReflection()}
						>
							{#snippet children()}{i18n.t('analysis.saveReflection')}{/snippet}
						</AppButton>
					{:else}
						<button
							type="button"
							class="quiz-arrow"
							disabled={!canGoForward || saving}
							aria-label={i18n.t('analysis.next')}
							onclick={() => void goForward()}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z" />
							</svg>
						</button>
					{/if}
				</nav>
			</div>
		{/if}
	{/snippet}
</AppFullscreen>

<style>
	.event-header {
		position: relative;
		min-height: 3.5rem;
		padding-right: 2rem;
		padding-bottom: 1.75rem;
	}

	.event-header__title {
		margin: 0;
		padding-right: var(--space-2);
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.event-header__input {
		width: 100%;
		min-height: 3.5rem;
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--fill-subtle);
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		line-height: var(--leading-tight);
		resize: vertical;
	}

	.event-header__input:focus {
		outline: none;
		border-color: var(--accent-dim);
	}

	.event-header__edit {
		position: absolute;
		right: 0;
		bottom: 0;
		display: grid;
		place-items: center;
		width: 1.625rem;
		height: 1.625rem;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--fill-subtle);
		color: var(--text-faint);
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.event-header__edit:hover,
	.event-header__edit.active {
		border-color: var(--accent-dim);
		color: var(--text);
	}

	.event-header__edit svg {
		width: 0.875rem;
		height: 0.875rem;
		fill: currentColor;
	}

	.reflection {
		display: flex;
		flex-direction: column;
		min-height: calc(100dvh - 12rem);
		max-width: var(--content-max-width);
		margin: 0 auto;
	}

	.quiz-step {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-5);
		min-height: 0;
	}

	.quiz-question {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text);
	}

	.quiz-input {
		width: 100%;
		min-height: 10rem;
		flex: 1;
		resize: none;
		font: inherit;
		font-size: var(--text-base);
		line-height: var(--leading-normal);
		color: var(--text);
		background: var(--fill-subtle);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-4);
	}

	.quiz-input:focus {
		outline: none;
		border-color: var(--accent-dim);
	}

	.quiz-nav {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding-top: var(--space-5);
		border-top: 1px solid var(--border);
	}

	.quiz-arrow {
		display: grid;
		place-items: center;
		width: var(--size-touch);
		height: var(--size-touch);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--fill-subtle);
		color: var(--text-muted);
		cursor: pointer;
		transition: var(--transition-interactive);
		-webkit-tap-highlight-color: transparent;
	}

	.quiz-arrow svg {
		width: var(--text-lg);
		height: var(--text-lg);
		fill: currentColor;
	}

	.quiz-arrow:hover:not(:disabled),
	.quiz-arrow:focus-visible:not(:disabled) {
		border-color: var(--accent-dim);
		color: var(--text);
	}

	.quiz-arrow:disabled {
		opacity: 0.28;
		cursor: not-allowed;
	}

	.rf-resonance {
		display: grid;
		gap: var(--space-4);
	}

	.rf-score-row {
		display: flex;
		justify-content: flex-end;
	}

	.rf-score-value {
		font-family: var(--font-serif);
		font-size: var(--text-2xl);
		line-height: 1;
		margin: 0;
	}

	.rf-score-value.positive {
		color: var(--accent-leaf);
	}

	.rf-score-value.negative {
		color: var(--accent-rose);
	}

	.scale-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-xs);
		color: var(--text-faint);
	}
</style>
