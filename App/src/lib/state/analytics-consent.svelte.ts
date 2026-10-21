import { initAnalytics, setAnalyticsConsent } from '$lib/analytics';

/**
 * Usage statistics consent. The app works the same either way, saving to the device as before.
 * "Allow" is remembered, so the popup does not come back. A refusal is not remembered: without
 * the stored choice we cannot tell who this is, so the popup is asked again at the next launch,
 * and until then only anonymous counts are sent.
 */
class AnalyticsConsentStore {
	granted = $state(false);
	/** Show the popup. */
	prompt = $state(false);
	/** Why the popup is shown: at launch, or because the user tapped sync. */
	reason = $state<'start' | 'sync'>('start');

	#afterAllow: (() => void) | null = null;

	init(): void {
		this.granted = initAnalytics() === 'granted';
		this.reason = 'start';
		this.prompt = !this.granted;
	}

	/** Asks for the permission that a feature needs, then runs `afterAllow`. */
	askFor(reason: 'sync', afterAllow: () => void): void {
		if (this.granted) {
			afterAllow();
			return;
		}
		this.reason = reason;
		this.#afterAllow = afterAllow;
		this.prompt = true;
	}

	allow(): void {
		setAnalyticsConsent('granted');
		this.granted = true;
		this.prompt = false;
		const next = this.#afterAllow;
		this.#afterAllow = null;
		next?.();
	}

	/** Keeps the anonymous mode for this session; the popup returns next launch. */
	decline(): void {
		this.#afterAllow = null;
		this.prompt = false;
	}
}

export const analyticsConsent = new AnalyticsConsentStore();
