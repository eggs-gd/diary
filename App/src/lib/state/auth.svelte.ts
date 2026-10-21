import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { firebaseApp } from '$lib/firebase';
import { track } from '$lib/analytics';
import { analyticsConsent } from '$lib/state/analytics-consent.svelte';

export interface AuthUser {
	uid: string;
	email: string | null;
	name: string | null;
}

const NATIVE_SIGN_IN_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
	]);
}

/**
 * Google-only sign-in for journal sync. The Firebase JS SDK holds the session on
 * every platform (Realtime Database rules read `auth.uid` via the JS SDK). On
 * native, `@capacitor-firebase/authentication` runs the OS Google flow and we
 * exchange the id token for a JS-SDK credential.
 *
 * Native auth uses `initializeAuth` without a popup/redirect resolver — `getAuth`
 * would try to load an iframe from `authDomain`, which hangs in the WebView.
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
		return browser && !!firebaseApp;
	}

	get #native(): boolean {
		return Capacitor.isNativePlatform();
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
			const m = await this.#mod();
			this.#auth = this.#native
				? m.initializeAuth(firebaseApp!, {
						persistence: [
							m.indexedDBLocalPersistence,
							m.browserLocalPersistence,
							m.inMemoryPersistence
						]
					})
				: m.getAuth(firebaseApp!);
			if (!this.#listening) {
				this.#listening = true;
				m.onAuthStateChanged(this.#auth, (u) => {
					this.user = u ? { uid: u.uid, email: u.email, name: u.displayName } : null;
					this.ready = true;
				});
				if (!this.#native) {
					// Resolve a pending redirect sign-in (mobile web popup fallback).
					m.getRedirectResult(this.#auth).catch(() => {});
				}
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
		if (this.busy || !this.available) return;
		// Sync needs the app to be allowed to save; otherwise ask first.
		if (!analyticsConsent.granted) {
			analyticsConsent.ask();
			return;
		}
		this.busy = true;
		try {
			const auth = await this.#getAuth();
			if (!auth) return;
			const m = await this.#mod();
			const provider = new m.GoogleAuthProvider();

			if (this.#native) {
				const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
				const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
				const idToken = result.credential?.idToken;
				if (!idToken) return; // user cancelled
				console.log('[auth] google id token received, exchanging for JS credential');
				await withTimeout(
					m.signInWithCredential(auth, m.GoogleAuthProvider.credential(idToken)),
					NATIVE_SIGN_IN_TIMEOUT_MS,
					'signInWithCredential'
				);
				console.log('[auth] signInWithCredential ok');
				track('auth_sign_in', { provider: 'google', method: 'native' });
				return;
			}

			try {
				await m.signInWithPopup(auth, provider);
				track('auth_sign_in', { provider: 'google', method: 'popup' });
			} catch (err) {
				const code = (err as { code?: string })?.code ?? '';
				if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
					return;
				}
				if (
					code === 'auth/popup-blocked' ||
					code === 'auth/operation-not-supported-in-this-environment'
				) {
					track('auth_sign_in', { provider: 'google', method: 'redirect' });
					await m.signInWithRedirect(auth, provider);
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
		if (this.#native) {
			const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
			await FirebaseAuthentication.signOut().catch(() => {});
		}
		const { signOut } = await this.#mod();
		await signOut(auth);
		track('auth_sign_out');
	}
}

export const authStore = new AuthStore();
