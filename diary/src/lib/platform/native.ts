import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ensureEventsReady } from '$lib/storage';
import { applySystemTextZoom, initSystemTextZoom, teardownSystemTextZoom } from './text-scale';

let appBackListener: { remove: () => void } | null = null;
let viewportChangeHandler: (() => void) | null = null;

function lockViewportScale(): void {
	const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
	if (!meta) return;

	meta.setAttribute(
		'content',
		'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, viewport-fit=cover, user-scalable=no'
	);
}

export async function initNativePlatform(onAppBack?: () => void): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	lockViewportScale();
	if (Capacitor.getPlatform() === 'ios') {
		viewportChangeHandler = () => {
			lockViewportScale();
			void applySystemTextZoom();
		};
		window.addEventListener('resize', viewportChangeHandler);
	}

	await initSystemTextZoom();
	await ensureEventsReady();

	try {
		await StatusBar.setStyle({ style: Style.Dark });
	} catch {
		// Status bar plugin is optional outside native shells.
	}

	if (onAppBack) {
		appBackListener?.remove();
		appBackListener = await App.addListener('backButton', () => {
			onAppBack();
		});
	}
}

export async function hapticLight(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	try {
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		// Ignore haptics failures on unsupported devices.
	}
}

export function teardownNativePlatform(): void {
	if (viewportChangeHandler) {
		window.removeEventListener('resize', viewportChangeHandler);
		viewportChangeHandler = null;
	}
	teardownSystemTextZoom();
	appBackListener?.remove();
	appBackListener = null;
}
