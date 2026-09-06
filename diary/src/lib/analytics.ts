import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { browser } from '$app/environment';
import { firebaseApp } from './firebase';

type Params = Record<string, string | number | boolean>;

type WebLogger = (name: string, params?: Params) => void;

let webLogger: Promise<WebLogger | null> | null = null;

/**
 * Lazily wires `firebase/analytics` for the web/PWA build. Kept out of the main
 * bundle via dynamic import; resolves to `null` where analytics can't run
 * (prerender, native, private mode, no IndexedDB, blockers).
 */
function getWebLogger(): Promise<WebLogger | null> {
	if (!webLogger) {
		webLogger = (async () => {
			try {
				if (!browser || !firebaseApp) return null;
				const { isSupported, getAnalytics, logEvent } = await import('firebase/analytics');
				if (!(await isSupported())) return null;
				const analytics = getAnalytics(firebaseApp);
				return (name, params) => logEvent(analytics, name, params);
			} catch {
				return null;
			}
		})();
	}
	return webLogger;
}

export function track(eventName: string, params?: Params): void {
	if (Capacitor.isNativePlatform()) {
		FirebaseAnalytics.logEvent({ name: eventName, params }).catch(() => {});
		return;
	}

	void getWebLogger()
		.then((log) => log?.(eventName, params))
		.catch(() => {});
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
