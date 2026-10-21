import { initAnalytics, setAnalyticsConsent } from '$lib/analytics';

/**
 * Analytics consent as UI state. Anonymous counts always run; allowing identifiers is asked at every
 * launch until the user says yes (only 'granted' is remembered).
 */
class AnalyticsConsentStore {
	granted = $state(false);
	/** Show the startup prompt. */
	prompt = $state(false);

	init(): void {
		this.granted = initAnalytics() === 'granted';
		this.prompt = !this.granted;
	}

	allow(): void {
		setAnalyticsConsent('granted');
		this.granted = true;
		this.prompt = false;
	}

	/** Keeps the anonymous mode for this session; the prompt comes back next launch. */
	decline(): void {
		this.prompt = false;
	}

	revoke(): void {
		setAnalyticsConsent('denied');
		this.granted = false;
	}
}

export const analyticsConsent = new AnalyticsConsentStore();
