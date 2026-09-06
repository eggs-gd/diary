import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';

// Web client config. Not secret — the same identifiers ship in the native
// GoogleService-Info.plist / google-services.json. Native builds initialise
// Firebase from those bundled files; the web/PWA build needs this explicit call.
const firebaseConfig = {
	apiKey: 'AIzaSyAFSh0gu-rYSXBVkq6bNqm88rKhGzE9VNg',
	authDomain: 'awareness-journal.firebaseapp.com',
	databaseURL: 'https://awareness-journal-default-rtdb.europe-west1.firebasedatabase.app',
	projectId: 'awareness-journal',
	storageBucket: 'awareness-journal.firebasestorage.app',
	messagingSenderId: '24354789873',
	appId: '1:24354789873:web:4b06254f3c18b3e0f3cc50',
	measurementId: 'G-W7F2PWQ270'
};

/**
 * Web-only Firebase app. `null` during prerender and on native platforms
 * (native uses its own bundled config).
 */
export const firebaseApp: FirebaseApp | null =
	browser && !Capacitor.isNativePlatform() ? initializeApp(firebaseConfig) : null;

/** Journal sync (Realtime Database) is inert until `databaseURL` is set. */
export const SYNC_ENABLED = firebaseConfig.databaseURL.length > 0;

/** The `authDomain` (`*.firebaseapp.com`) hosts the OAuth handler. GitHub Pages
 * cannot serve `/__/auth/handler`, so web sign-in bounces through that domain. */
