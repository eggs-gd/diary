import { Capacitor } from '@capacitor/core';
import { ConsentStatus, ConsentType, FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { browser } from '$app/environment';
import { MEASUREMENT_ID } from './firebase';

type Params = Record<string, string | number | boolean>;

/**
 * One "Allow" covers saving and statistics. Until it is given the app keeps everything in memory
 * (nothing is saved, not even locally; see $lib/storage) and Google Analytics runs in Consent
 * Mode with analytics storage denied: no cookies, no app instance ID, only anonymous counts.
 * Allowing switches both on; only 'granted' is remembered. A refusal is asked again at the next
 * launch.
 */
export type AnalyticsConsent = 'granted' | 'denied';

const STORAGE_KEY = 'analyticsConsent';

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

let consent: AnalyticsConsent = 'denied';
let tagLoaded = false;
// Native calls run in order, so a consent change is always applied before the events after it.
let nativeQueue: Promise<unknown> = Promise.resolve();

function gtag(..._args: unknown[]): void {
	(window.dataLayer ??= []).push(arguments);
}

function loadWebTag(): void {
	if (tagLoaded || !browser) return;
	tagLoaded = true;
	window.gtag = gtag;
	gtag('consent', 'default', {
		analytics_storage: consent,
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied'
	});
	gtag('js', new Date());
	gtag('config', MEASUREMENT_ID);
	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
	document.head.appendChild(script);
}

function native(run: () => Promise<unknown>): void {
	nativeQueue = nativeQueue.then(run).catch(() => {});
}

function applyNativeConsent(choice: AnalyticsConsent): void {
	const status = choice === 'granted' ? ConsentStatus.Granted : ConsentStatus.Denied;
	native(() => FirebaseAnalytics.setConsent({ type: ConsentType.AnalyticsStorage, status }));
	for (const type of [
		ConsentType.AdStorage,
		ConsentType.AdUserData,
		ConsentType.AdPersonalization
	]) {
		native(() => FirebaseAnalytics.setConsent({ type, status: ConsentStatus.Denied }));
	}
}

/** Whether the user has allowed saving (read straight from storage, so it is valid before init). */
export function hasStoredConsent(): boolean {
	try {
		return browser && localStorage.getItem(STORAGE_KEY) === 'granted';
	} catch {
		return false;
	}
}

/** Reads the stored choice and applies it. Call once at startup, before the first track(). */
export function initAnalytics(): AnalyticsConsent {
	let stored: string | null = null;
	try {
		stored = browser ? localStorage.getItem(STORAGE_KEY) : null;
	} catch {
		// no storage: treated as not allowed
	}
	consent = stored === 'granted' ? 'granted' : 'denied';
	if (Capacitor.isNativePlatform()) applyNativeConsent(consent);
	else loadWebTag();
	return consent;
}

/** Applies a new choice. Only 'granted' is stored. */
export function setAnalyticsConsent(choice: AnalyticsConsent): void {
	consent = choice;
	try {
		if (choice === 'granted') localStorage.setItem(STORAGE_KEY, 'granted');
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// the choice then lasts for this session only
	}
	if (Capacitor.isNativePlatform()) applyNativeConsent(choice);
	else {
		loadWebTag();
		gtag('consent', 'update', { analytics_storage: choice });
	}
}

/** Every event carries the consent state, so anonymous and allowed data can be told apart in GA4. */
export function track(eventName: string, params?: Params): void {
	const payload: Params = { ...params, consent };
	if (Capacitor.isNativePlatform()) {
		native(() => FirebaseAnalytics.logEvent({ name: eventName, params: payload }));
		return;
	}
	if (!browser) return;
	loadWebTag();
	gtag('event', eventName, payload);
}

interface TrackVisibleOptions {
	event: string;
	params?: Params;
	threshold?: number;
	key?: string | number;
}

export function trackVisible(node: HTMLElement, initialOptions: TrackVisibleOptions) {
	let options = initialOptions;
	let fired = false;

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry?.isIntersecting && !fired) {
				fired = true;
				track(options.event, options.params);
			}
		},
		{ threshold: options.threshold ?? 0.5 }
	);

	observer.observe(node);

	return {
		update(newOptions: TrackVisibleOptions) {
			if (newOptions.key !== options.key) {
				fired = false;
			}
			options = newOptions;
		},
		destroy() {
			observer.disconnect();
		}
	};
}
