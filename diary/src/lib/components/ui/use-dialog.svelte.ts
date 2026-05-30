function blurActiveElement(): void {
	const active = document.activeElement;
	if (active instanceof HTMLElement) active.blur();
}

export function useDialog(
	getOpen: () => boolean,
	getOnClose: () => () => void,
	getDialog: () => HTMLDialogElement | null
): { dismiss: () => void; handleDialogClose: () => void; handleCancel: (e: Event) => void } {
	function notifyClosed(): void {
		if (!getOpen()) return;
		getOnClose()();
		requestAnimationFrame(blurActiveElement);
	}

	function dismiss(): void {
		const d = getDialog();
		if (d?.open) {
			d.close();
			return;
		}
		notifyClosed();
	}

	function handleDialogClose(): void {
		notifyClosed();
	}

	function handleCancel(event: Event): void {
		event.preventDefault();
		dismiss();
	}

	$effect(() => {
		const d = getDialog();
		if (!d) return;
		if (getOpen() && !d.open) {
			d.showModal();
			requestAnimationFrame(blurActiveElement);
		} else if (!getOpen() && d.open) {
			d.close();
		}
	});

	return { dismiss, handleDialogClose, handleCancel };
}
