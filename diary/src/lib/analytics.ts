import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

type Params = Record<string, string | number | boolean>;

export function track(eventName: string, params?: Params): void {
	FirebaseAnalytics.logEvent({ name: eventName, params }).catch(() => {});
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
