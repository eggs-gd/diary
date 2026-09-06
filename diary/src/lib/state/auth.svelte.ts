import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { firebaseApp } from '$lib/firebase';
import { track } from '$lib/analytics';

export interface AuthUser {
	uid: string;
	email: string | null;
	name: string | null;
}

/**
 * Google-only sign-in for journal sync. Web uses the Firebase Auth JS SDK
 * (lazy-loaded). Native sign-in is not wired yet — `signIn()` is a no-op there
 * until `@capacitor-firebase/authentication` is added.
 */
class AuthStore {
	user = $state<AuthUser | null>(null);
	busy = $state(false);
	/** true once the persisted session (if any) has been resolved */
	ready = $state(false);

	#modPromise: Promise<typeof import('firebase/auth')> | null = null;
	#auth: import('firebase/auth').Auth | null = null;
	#listening = false;

	get available(): boolean {
		return browser && !!firebaseApp && !Capacitor.isNativePlatform();
	}

	#mod(): Promise<typeof import('firebase/auth')> {
		return (this.#modPromise ??= import('firebase/auth'));
	}

	async #getAuth(): Promise<import('firebase/auth').Auth | null> {
		if (!this.available) {
			this.ready = true;
			return null;
		}
		if (!this.#auth) {
			const { getAuth, onAuthStateChanged, getRedirectResult } = await this.#mod();
			this.#auth = getAuth(firebaseApp!);
			if (!this.#listening) {
				this.#listening = true;
				onAuthStateChanged(this.#auth, (u) => {
					this.user = u ? { uid: u.uid, email: u.email, name: u.displayName } : null;
					this.ready = true;
				});
				// Resolve a pending redirect sign-in (mobile popup fallback).
				getRedirectResult(this.#auth).catch(() => {});
			}
		}
		return this.#auth;
	}

	/** Call once on app start so the badge reflects a persisted session. */
	init(): void {
		if (this.available) void this.#getAuth();
		else this.ready = true;
	}

	async signIn(): Promise<void> {
		if (this.busy) return;
		if (!this.available) return; // TODO: native via @capacitor-firebase/authentication

		this.busy = true;
		try {
			const auth = await this.#getAuth();
			if (!auth) return;
			const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await this.#mod();
			const provider = new GoogleAuthProvider();
			try {
				await signInWithPopup(auth, provider);
				track('auth_sign_in', { provider: 'google', method: 'popup' });
			} catch (err) {
				const code = (err as { code?: string })?.code ?? '';
				if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
					return; // user dismissed
				}
				if (
					code === 'auth/popup-blocked' ||
					code === 'auth/operation-not-supported-in-this-environment'
				) {
					track('auth_sign_in', { provider: 'google', method: 'redirect' });
					await signInWithRedirect(auth, provider); // navigates away
					return;
				}
				throw err;
			}
		} catch (err) {
			console.error('[auth] sign-in failed', err);
		} finally {
			this.busy = false;
		}
	}

	async signOut(): Promise<void> {
		if (!this.available) return;
		const auth = await this.#getAuth();
		if (!auth) return;
		const { signOut } = await this.#mod();
		await signOut(auth);
		track('auth_sign_out');
	}
}

export const authStore = new AuthStore();
