import adapter from '@sveltejs/adapter-static';

// Served at the apex of journal.eggs.gd. Override with BASE_PATH only for a subpath preview.
const basePath = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			strict: true
		}),
		paths: {
			base: basePath
		}
	}
};

export default config;
