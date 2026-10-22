import { initAnalytics, setAnalyticsConsent, track } from '$lib/analytics';

/**
 * Usage statistics consent. The app works the same either way, saving to the device as before.
 * The popup is offered once per session after the first thing the user does (so the first signal
 * comes from someone who actually used the app), and when they tap sync, which needs it.
 * "Allow" is remembered; a refusal is not, so it is offered again in the next session. Until
 * then only anonymous counts are sent.
 */
class AnalyticsConsentStore {
	granted = $state(false);
	/** Show the popup. */
	prompt = $state(false);
	/** Why the popup is shown: after the first action, or because the user tapped sync. */
	reason = $state<'offer' | 'sync'>('offer');

	#afterAllow: (() => void) | null = null;
	#offered = false;

	init(): void {
		this.granted = initAnalytics() === 'granted';
	}

	/** Offers the popup once per session; call it after the user's first real action. */
	offer(): void {
		if (this.granted || this.#offered) return;
		this.#offered = true;
		this.reason = 'offer';
		this.prompt = true;
	}

	/** Asks for the permission that a feature needs, then runs `afterAllow`. */
	askFor(reason: 'sync', afterAllow: () => void): void {
		if (this.granted) {
			afterAllow();
			return;
		}
		// Asking for sync counts as the session's offer, so a refusal here is not followed by the
		// automatic popup after the first action. Later sync taps still ask again.
		this.#offered = true;
		this.reason = reason;
		this.#afterAllow = afterAllow;
		this.prompt = true;
	}

	allow(): void {
		setAnalyticsConsent('granted');
		this.granted = true;
		this.prompt = false;
		track('consent_granted');
		const next = this.#afterAllow;
		this.#afterAllow = null;
		next?.();
	}

	/** Keeps the anonymous mode for this session. */
	decline(): void {
		this.#afterAllow = null;
		this.prompt = false;
		track('consent_declined');
	}
}

export const analyticsConsent = new AnalyticsConsentStore();
