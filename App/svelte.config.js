import adapter from '@sveltejs/adapter-static';

// Web/PWA builds served from a sub-path set BASE_PATH (e.g. "/pwa").
// Native Capacitor builds leave it empty so assets resolve from the app root.
const basePath = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			strict: false
		}),
		paths: {
			base: basePath
		},
		serviceWorker: {
			// Only register the SW for the web PWA build (BASE_PATH set);
			// native Capacitor builds serve from their own scheme and must not cache.
			register: Boolean(process.env.BASE_PATH)
		}
	}
};

export default config;
