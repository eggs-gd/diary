import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { TextZoom } from '@capacitor/text-zoom';

const ROOT_BASE_PX = 16;

let appStateListener: PluginListenerHandle | null = null;
let visibilityHandler: (() => void) | null = null;

function applyRootFontScale(scale: number): void {
	const root = document.documentElement;
	const percent = Math.round(scale * 100);

	root.style.fontSize = `${ROOT_BASE_PX * scale}px`;
	root.style.setProperty('-webkit-text-size-adjust', `${percent}%`);
	root.style.setProperty('text-size-adjust', `${percent}%`);
}

export async function applySystemTextZoom(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;

	try {
		const { value } = await TextZoom.getPreferred();
		if (!Number.isFinite(value) || value <= 0) return;

		if (Capacitor.getPlatform() === 'ios') {
			applyRootFontScale(value);
			return;
		}

		await TextZoom.set({ value });
	} catch {
		// Plugin unavailable in web preview or early native startup.
	}
}

function scheduleReapply(): void {
	requestAnimationFrame(() => {
		void applySystemTextZoom();
	});
}

export async function initSystemTextZoom(): Promise<void> {
	await applySystemTextZoom();
	setTimeout(() => void applySystemTextZoom(), 150);

	appStateListener?.remove();
	appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
		if (isActive) scheduleReapply();
	});

	visibilityHandler = () => {
		if (document.visibilityState === 'visible') scheduleReapply();
	};
	document.addEventListener('visibilitychange', visibilityHandler);
}

export function teardownSystemTextZoom(): void {
	appStateListener?.remove();
	appStateListener = null;

	if (visibilityHandler) {
		document.removeEventListener('visibilitychange', visibilityHandler);
		visibilityHandler = null;
	}
}
