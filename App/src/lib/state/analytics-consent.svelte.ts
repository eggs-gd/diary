import { hasStoredConsent, initAnalytics, setAnalyticsConsent } from '$lib/analytics';
import { enablePersistence } from '$lib/storage';
import { dayReflectionStore } from '$lib/state/day-reflections.svelte';
import { eventStore } from '$lib/state/events.svelte';

/**
 * One "Allow" covers saving the archive on the device and usage statistics. Without it the app is
 * session-only; the popup comes back at the next launch.
 */
class AnalyticsConsentStore {
	granted = $state(false);
	/** Show the popup. */
	prompt = $state(false);

	init(): void {
		this.granted = initAnalytics() === 'granted';
		this.prompt = !this.granted;
	}

	/** Opens the popup again (e.g. when a feature that needs saving is used). */
	ask(): void {
		if (!hasStoredConsent()) this.prompt = true;
	}

	async allow(): Promise<void> {
		this.prompt = false;
		await enablePersistence();
		setAnalyticsConsent('granted');
		this.granted = true;
		await Promise.all([eventStore.load(), dayReflectionStore.load()]);
	}

	/** Keeps the session-only mode; the popup returns next launch. */
	decline(): void {
		this.prompt = false;
	}
}

export const analyticsConsent = new AnalyticsConsentStore();
