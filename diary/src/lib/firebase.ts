import { browser } from '$app/environment';
import { initializeApp, type FirebaseApp } from 'firebase/app';

// Web client config. Not secret — the same identifiers ship in the native
// GoogleService-Info.plist / google-services.json. The native Firebase SDKs
// initialise from those bundled files; the JS SDK in the webview (used here for
// Auth + Realtime Database) needs this explicit call on every platform.
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

/** JS-SDK Firebase app for the webview (Auth + Realtime Database). `null` during prerender. */
export const firebaseApp: FirebaseApp | null = browser ? initializeApp(firebaseConfig) : null;

/** Journal sync (Realtime Database) is inert until `databaseURL` is set. */
export const SYNC_ENABLED = firebaseConfig.databaseURL.length > 0;

/** The `authDomain` (`*.firebaseapp.com`) hosts the OAuth handler. GitHub Pages
 * cannot serve `/__/auth/handler`, so web sign-in bounces through that domain. */
