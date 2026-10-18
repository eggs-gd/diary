export interface NavigationHost {
	popPanel?: () => boolean;
	closeProfile?: () => boolean;
	isProfileOpen?: () => boolean;
}

let host = $state<NavigationHost>({});

export function setNavigationHost(next: NavigationHost): void {
	host = { ...host, ...next };
}

export function patchNavigationHost(next: Partial<NavigationHost>): () => void {
	const prev = { ...host };
	host = { ...host, ...next };
	return () => {
		host = prev;
	};
}

/** Returns true when the back action was handled. */
export function handleAppBack(): boolean {
	if (host.isProfileOpen?.()) {
		return host.closeProfile?.() ?? true;
	}
	if (host.popPanel?.()) return true;
	return false;
}
