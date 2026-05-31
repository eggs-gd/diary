import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const PENDING_SHARE_TEXT_KEY = 'guanming.pendingShareText';

export async function initShareIntent(onText: (text: string) => void): Promise<() => void> {
	if (!Capacitor.isNativePlatform()) return () => {};

	let urlListener: PluginListenerHandle | null = null;
	let stateListener: PluginListenerHandle | null = null;

	async function consumePendingShareText(): Promise<void> {
		const { value } = await Preferences.get({ key: PENDING_SHARE_TEXT_KEY });
		const text = value?.trim();
		if (!text) return;

		await Preferences.remove({ key: PENDING_SHARE_TEXT_KEY });
		onText(text);
	}

	try {
		// Check for text saved before the app launched (cold start or bg→fg)
		await consumePendingShareText();

		// Also check launch URL in case app was opened via guanming://share-pending
		const launch = await App.getLaunchUrl();
		if (launch?.url?.includes('share-pending')) {
			await consumePendingShareText();
		}

		// Re-check when app becomes active (returned from share extension)
		stateListener = await App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) void consumePendingShareText();
		});

		// Re-check when opened via URL scheme
		urlListener = await App.addListener('appUrlOpen', () => {
			void consumePendingShareText();
		});
	} catch {
		// Share intent is iOS/native-only; ignore errors in web preview.
	}

	return () => {
		urlListener?.remove();
		stateListener?.remove();
	};
}
