#!/usr/bin/env node
// Copies App/build into Site/static/pwa. The Pages workflow runs this after
// `yarn build:pwa`. Locally: `make pwa` from the repository root.

import { cp, rm, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(repoRoot, 'App');
const source = resolve(appRoot, 'build');
const target = resolve(repoRoot, 'Site/static/pwa');

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

if (!(await exists(source))) {
	console.error(`✗ Build output not found at ${source}. Run the build first.`);
	process.exit(1);
}

const siteStatic = resolve(target, '..');
if (!(await exists(siteStatic))) {
	console.error(`✗ Site static dir not found at ${siteStatic}. Is Site inside this repo?`);
	process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`✓ PWA copied to ${target}`);
