import { browser } from '$app/environment';

let lockCount = 0;
let savedScrollY = 0;
let touchMoveHandler: ((event: TouchEvent) => void) | null = null;
let wheelHandler: ((event: WheelEvent) => void) | null = null;

function applyLock(): void {
	savedScrollY = window.scrollY;
	document.documentElement.classList.add('scroll-locked');
	document.body.style.position = 'fixed';
	document.body.style.top = `-${savedScrollY}px`;
	document.body.style.left = '0';
	document.body.style.right = '0';
	document.body.style.width = '100%';
	document.body.style.overflow = 'hidden';
}

function removeLock(): void {
	document.documentElement.classList.remove('scroll-locked');
	document.body.style.position = '';
	document.body.style.top = '';
	document.body.style.left = '';
	document.body.style.right = '';
	document.body.style.width = '';
	document.body.style.overflow = '';
	window.scrollTo(0, savedScrollY);
}

/** Lock page scroll while a modal is open. Allows touch scroll inside `getAllowedRoot`. */
export function lockDocumentScroll(getAllowedRoot?: () => HTMLElement | null): () => void {
	if (!browser) return () => {};

	lockCount += 1;
	if (lockCount === 1) {
		applyLock();

		touchMoveHandler = (event: TouchEvent) => {
			const root = getAllowedRoot?.();
			if (root && event.target instanceof Node && root.contains(event.target)) return;
			event.preventDefault();
		};
		wheelHandler = (event: WheelEvent) => {
			const root = getAllowedRoot?.();
			if (root && event.target instanceof Node && root.contains(event.target)) return;
			event.preventDefault();
		};

		document.addEventListener('touchmove', touchMoveHandler, { passive: false });
		document.addEventListener('wheel', wheelHandler, { passive: false });
	}

	return () => {
		if (lockCount === 0) return;
		lockCount -= 1;
		if (lockCount > 0) return;

		if (touchMoveHandler) {
			document.removeEventListener('touchmove', touchMoveHandler);
			touchMoveHandler = null;
		}
		if (wheelHandler) {
			document.removeEventListener('wheel', wheelHandler);
			wheelHandler = null;
		}
		removeLock();
	};
}
