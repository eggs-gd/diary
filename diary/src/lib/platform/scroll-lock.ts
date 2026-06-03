import { browser } from '$app/environment';

type AllowedRootGetter = () => HTMLElement | null;

let lockCount = 0;
const allowedRoots: AllowedRootGetter[] = [];
let savedScrollY = 0;
let touchMoveHandler: ((event: TouchEvent) => void) | null = null;
let wheelHandler: ((event: WheelEvent) => void) | null = null;

function eventInsideAllowedRoot(event: Event): boolean {
	const path = event.composedPath();
	for (let i = allowedRoots.length - 1; i >= 0; i -= 1) {
		const root = allowedRoots[i]?.();
		if (!root?.isConnected) continue;
		if (path.includes(root)) return true;
	}
	return false;
}

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

function installHandlers(): void {
	touchMoveHandler = (event: TouchEvent) => {
		if (eventInsideAllowedRoot(event)) return;
		event.preventDefault();
	};
	wheelHandler = (event: WheelEvent) => {
		if (eventInsideAllowedRoot(event)) return;
		event.preventDefault();
	};

	document.addEventListener('touchmove', touchMoveHandler, { passive: false });
	document.addEventListener('wheel', wheelHandler, { passive: false });
}

function uninstallHandlers(): void {
	if (touchMoveHandler) {
		document.removeEventListener('touchmove', touchMoveHandler);
		touchMoveHandler = null;
	}
	if (wheelHandler) {
		document.removeEventListener('wheel', wheelHandler);
		wheelHandler = null;
	}
}

/** Lock page scroll while a modal is open. Allows touch scroll inside `getAllowedRoot`. */
export function lockDocumentScroll(getAllowedRoot?: () => HTMLElement | null): () => void {
	if (!browser) return () => {};

	const getter = getAllowedRoot ?? (() => null);
	allowedRoots.push(getter);
	lockCount += 1;

	if (lockCount === 1) {
		applyLock();
		installHandlers();
	}

	return () => {
		if (lockCount === 0) return;

		const index = allowedRoots.indexOf(getter);
		if (index >= 0) allowedRoots.splice(index, 1);

		lockCount -= 1;
		if (lockCount > 0) return;

		uninstallHandlers();
		removeLock();
	};
}
