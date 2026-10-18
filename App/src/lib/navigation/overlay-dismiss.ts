/** Animated overlay dismiss registered by PanelOverlay. */
let dismissHandler: (() => void) | null = null;

export function registerOverlayDismiss(handler: () => void): () => void {
	dismissHandler = handler;
	return () => {
		if (dismissHandler === handler) dismissHandler = null;
	};
}

export function requestOverlayDismiss(): boolean {
	if (!dismissHandler) return false;
	dismissHandler();
	return true;
}
