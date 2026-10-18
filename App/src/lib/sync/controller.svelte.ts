import { track } from '$lib/analytics';
import { SYNC_ENABLED } from '$lib/firebase';
import type { DayReflection, EventEntry } from '$lib/events/types';
import { authStore } from '$lib/state/auth.svelte';
import { eventStore } from '$lib/state/events.svelte';
import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
import { diffForRemote, mergeCollection } from './snapshot';
import { pullJournal, pushJournal } from './remote';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

const PUSH_DEBOUNCE_MS = 4000;
const RESUME_THROTTLE_MS = 30_000;

const eventKey = (e: EventEntry): string => e.id;
const eventUpdatedAt = (e: EventEntry): string => e.updatedAt ?? e.createdAt;
const reflectionKey = (r: DayReflection): string => r.dayKey;
const reflectionUpdatedAt = (r: DayReflection): string => r.updatedAt;

class SyncController {
	status = $state<SyncStatus>('off');
	lastSyncedAt = $state<number | null>(null);

	#pushTimer: ReturnType<typeof setTimeout> | null = null;
	#lastRun = 0;
	#running = false;
	#active = false;

	get #uid(): string | null {
		return authStore.user?.uid ?? null;
	}

	get enabled(): boolean {
		return SYNC_ENABLED;
	}

	/** Wire to auth: called when a user signs in. Idempotent. */
	start(): void {
		if (!SYNC_ENABLED || this.#active) return;
		this.#active = true;
		this.status = 'idle';
		eventStore.setMutationListener(() => this.schedulePush());
		dayReflectionStore.setMutationListener(() => this.schedulePush());
		void this.syncNow();
	}

	/** Called on sign-out. Local data is left untouched. Idempotent. */
	stop(): void {
		if (!this.#active) return;
		this.#active = false;
		this.#clearTimer();
		eventStore.setMutationListener(null);
		dayReflectionStore.setMutationListener(null);
		this.status = 'off';
		this.lastSyncedAt = null;
	}

	/** Debounced push after a local mutation. */
	schedulePush(): void {
		if (!this.#uid) return;
		this.#clearTimer();
		this.#pushTimer = setTimeout(() => void this.syncNow(), PUSH_DEBOUNCE_MS);
	}

	/** Throttled trigger for app resume / tab visibility. */
	resumeSync(): void {
		if (!this.#uid) return;
		if (Date.now() - this.#lastRun < RESUME_THROTTLE_MS) return;
		void this.syncNow();
	}

	async syncNow(): Promise<void> {
		const uid = this.#uid;
		if (!uid || this.#running) return;

		this.#clearTimer();
		this.#running = true;
		this.#lastRun = Date.now();
		this.status = 'syncing';

		try {
			const localEvents = await eventStore.snapshot();
			const localReflections = await dayReflectionStore.snapshot();
			const remote = await pullJournal(uid);

			const mergedEvents = mergeCollection(eventKey, eventUpdatedAt, localEvents, remote.events);
			const mergedReflections = mergeCollection(
				reflectionKey,
				reflectionUpdatedAt,
				localReflections,
				remote.reflections
			);

			await eventStore.applyMerged(mergedEvents);
			await dayReflectionStore.applyMerged(mergedReflections);

			await pushJournal(uid, {
				events: diffForRemote(eventKey, eventUpdatedAt, remote.events, mergedEvents),
				reflections: diffForRemote(
					reflectionKey,
					reflectionUpdatedAt,
					remote.reflections,
					mergedReflections
				)
			});

			this.lastSyncedAt = Date.now();
			this.status = 'idle';
			track('sync_completed', {
				events: mergedEvents.items.length,
				reflections: mergedReflections.items.length
			});
		} catch (err) {
			console.error('[sync] failed', err);
			this.status = 'error';
		} finally {
			this.#running = false;
		}
	}

	#clearTimer(): void {
		if (this.#pushTimer) {
			clearTimeout(this.#pushTimer);
			this.#pushTimer = null;
		}
	}
}

export const syncController = new SyncController();
