import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { argumentText, buildEntries } from './lib/appstore-seed.mjs';

// Store / landing screenshots for Attention Journal. The brief is AppStore/AppStoreImages.md.
// Needs the app running (cd App && yarn dev) and Google Chrome. Run from the repo root: make appstore

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../App');
const workspaceRoot = path.resolve(scriptDir, '..');
const outputRoot = process.env.APPSTORE_OUTPUT_DIR
	? path.resolve(process.env.APPSTORE_OUTPUT_DIR)
	: path.join(workspaceRoot, 'AppStore');
const require = createRequire(path.join(projectRoot, 'package.json'));
const sharp = require('sharp');

const tmpRoot = process.env.APPSTORE_TMP_DIR ?? '/private/tmp/attention-journal-appstore';
const appUrl = process.env.APPSTORE_APP_URL ?? 'http://127.0.0.1:5173/';
const chromePath =
	process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const remotePort = Number(process.env.APPSTORE_REMOTE_PORT ?? 9338);
const canvas = { width: 1242, height: 2688 };
const mobileViewport = { width: 390, height: 844, dpr: 3 };

const frames = [
	{
		file: 'appstore-01-daily.png',
		title: 'WRITE IT DOWN',
		subtitle: 'Even the smallest thing.\nOne line, one tap.',
		shot: 'daily',
		layout: 'phone'
	},
	{
		file: 'appstore-02-day-report.png',
		title: 'THE DAY ADDS UP',
		subtitle: 'Many small moments\noutweigh one bad one.',
		shot: 'dayReport',
		layout: 'phone'
	},
	{
		file: 'appstore-03-look-closer.png',
		title: 'LOOK CLOSER',
		subtitle: 'Two to four short questions.\nOnly when you want.',
		shot: 'wizard',
		layout: 'phone'
	},
	{
		file: 'appstore-04-see-it-differently.png',
		title: 'SEE IT DIFFERENTLY',
		subtitle: 'Re-score once you have looked.',
		shot: 'reflected',
		layout: 'phone'
	},
	{
		file: 'appstore-05-archive.png',
		title: 'COME BACK',
		subtitle: 'See how your days\nreally went.',
		shot: 'archive',
		layout: 'phone'
	}
];

const palette = {
	bg: '#0e0d0b',
	bg2: '#161411',
	paper: '#1a1814',
	text: '#e8e2d6',
	soft: '#b9b1a3',
	muted: '#8a8275',
	faint: '#5c564c',
	accent: '#c4a574'
};

class Cdp {
	constructor(wsUrl) {
		this.wsUrl = wsUrl;
		this.nextId = 1;
		this.pending = new Map();
	}

	async connect() {
		this.ws = new WebSocket(this.wsUrl);
		this.ws.addEventListener('message', (event) => {
			const message = JSON.parse(event.data);
			if (!message.id) return;
			const pending = this.pending.get(message.id);
			if (!pending) return;
			this.pending.delete(message.id);
			if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
			else pending.resolve(message.result);
		});
		await new Promise((resolve, reject) => {
			this.ws.addEventListener('open', resolve, { once: true });
			this.ws.addEventListener('error', reject, { once: true });
		});
	}

	send(method, params = {}, sessionId) {
		const id = this.nextId++;
		this.ws.send(JSON.stringify({ id, method, params, sessionId }));
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			setTimeout(() => {
				if (this.pending.has(id)) {
					this.pending.delete(id);
					reject(new Error(`CDP timeout: ${method}`));
				}
			}, 30000);
		});
	}

	close() {
		this.ws?.close();
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForChrome() {
	const endpoint = `http://127.0.0.1:${remotePort}/json/version`;
	for (let i = 0; i < 100; i++) {
		try {
			const res = await fetch(endpoint);
			if (res.ok) return res.json();
		} catch {}
		await sleep(100);
	}
	throw new Error('Chrome did not expose DevTools endpoint');
}

async function createPage(cdp) {
	const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
	const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
	await cdp.send('Page.enable', {}, sessionId);
	await cdp.send('Runtime.enable', {}, sessionId);
	await setViewport(cdp, sessionId, mobileViewport);
	return sessionId;
}

async function setViewport(cdp, sessionId, viewport) {
	await cdp.send(
		'Emulation.setDeviceMetricsOverride',
		{
			width: viewport.width,
			height: viewport.height,
			deviceScaleFactor: viewport.dpr,
			mobile: true,
			screenWidth: viewport.width,
			screenHeight: viewport.height
		},
		sessionId
	);
	await cdp.send(
		'Emulation.setUserAgentOverride',
		{
			userAgent:
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
		},
		sessionId
	);
}

async function evaluate(cdp, sessionId, expression) {
	const result = await cdp.send(
		'Runtime.evaluate',
		{ expression, awaitPromise: true, returnByValue: true },
		sessionId
	);
	if (result.exceptionDetails) {
		throw new Error(result.exceptionDetails.text || 'Runtime exception');
	}
	return result.result.value;
}

async function waitFor(cdp, sessionId, predicate, timeout = 12000) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		const ok = await evaluate(cdp, sessionId, `Boolean(${predicate})`);
		if (ok) return;
		await sleep(120);
	}
	throw new Error(`Timed out waiting for ${predicate}`);
}

async function navigate(cdp, sessionId) {
	await cdp.send('Page.navigate', { url: appUrl }, sessionId);
	await waitFor(cdp, sessionId, `document.readyState === 'complete'`);
	await sleep(600);
}

async function capture(cdp, sessionId, name, { fullPage = false } = {}) {
	await sleep(500);
	let params = { format: 'png', fromSurface: true };
	if (fullPage) {
		const metrics = await cdp.send('Page.getLayoutMetrics', {}, sessionId);
		const { width, height } = metrics.cssContentSize;
		params = {
			...params,
			captureBeyondViewport: true,
			clip: { x: 0, y: 0, width, height, scale: 1 }
		};
	}
	const { data } = await cdp.send('Page.captureScreenshot', params, sessionId);
	const file = path.join(tmpRoot, `${name}.png`);
	await writeFile(file, Buffer.from(data, 'base64'));
	return file;
}


/** Resets the app with fictional data. Analytics hosts are blocked so no test traffic is sent. */
async function resetApp(cdp, sessionId, { reflection = false, withProtocol = false } = {}) {
	await setViewport(cdp, sessionId, mobileViewport);
	await cdp.send('Network.enable', {}, sessionId);
	await cdp.send(
		'Network.setBlockedURLs',
		{ urls: ['*googletagmanager.com*', '*google-analytics.com*', '*analytics.google.com*'] },
		sessionId
	);
	await cdp.send('Page.navigate', { url: 'about:blank' }, sessionId);
	await waitFor(cdp, sessionId, `document.readyState === 'complete'`);
	await cdp.send('Page.navigate', { url: appUrl }, sessionId);
	await waitFor(cdp, sessionId, `document.readyState === 'complete'`);
	const entries = buildEntries(Date.now(), { withProtocol, history: true });
	await evaluate(
		cdp,
		sessionId,
		`(() => {
			localStorage.clear();
			localStorage.setItem('guanming.locale', 'en');
			localStorage.setItem('guanming.reflectionEnabled', '${reflection}');
			localStorage.setItem('analyticsConsent', 'granted');
			localStorage.setItem('guanming.events.v1', ${JSON.stringify(JSON.stringify(entries))});
			return true;
		})()`
	);
	await navigate(cdp, sessionId);
	await waitFor(cdp, sessionId, `document.querySelector('.group-day')`);
	// The "ask the I Ching" button on every row is not part of this story.
	await evaluate(
		cdp,
		sessionId,
		`(() => {
			const style = document.createElement('style');
			style.textContent = '[aria-label="Ask the I Ching about this"] { display: none !important; }';
			document.head.append(style);
			return true;
		})()`
	);
	await sleep(500);
}

async function clickSelector(cdp, sessionId, selector, description) {
	const ok = await evaluate(
		cdp,
		sessionId,
		`(() => {
			const target = document.querySelector(${JSON.stringify(selector)});
			if (!target) return false;
			target.click();
			return true;
		})()`
	);
	if (!ok) throw new Error(`Not found: ${description ?? selector}`);
	await sleep(700);
}

/** Hides the year and month headings (and optionally the first n days), so a list starts at a day. */
async function trimList(cdp, sessionId, hideDays = 0) {
	await evaluate(
		cdp,
		sessionId,
		`(() => {
			document
				.querySelectorAll('[id^="journal-year-"], [id^="journal-month-"]')
				.forEach((el) => (el.style.display = 'none'));
			[...document.querySelectorAll('.group-day')]
				.slice(0, ${hideDays})
				.forEach((el) => (el.style.display = 'none'));
			document.scrollingElement.scrollTop = 0;
			return true;
		})()`
	);
	await sleep(400);
}

/** Scrolls so the n-th element matching the selector sits `offset` px below the top. */
async function scrollToSelector(cdp, sessionId, selector, index, offset) {
	await evaluate(
		cdp,
		sessionId,
		`(() => {
			const target = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
			if (!target) return false;
			target.style.scrollMarginTop = '${offset}px';
			target.scrollIntoView({ block: 'start' });
			return true;
		})()`
	);
	await sleep(500);
}

async function openArgumentEntry(cdp, sessionId) {
	// Row labels change with the mode ("Start reflection" / the entry text), so match the text.
	const ok = await evaluate(
		cdp,
		sessionId,
		`(() => {
			const target = [...document.querySelectorAll('.group-day button')].find(
				(button) =>
					button.textContent.trim().startsWith(${JSON.stringify(argumentText)}) &&
					button.getAttribute('aria-label') !== 'Ask the I Ching about this'
			);
			if (!target) return false;
			target.click();
			return true;
		})()`
	);
	if (!ok) throw new Error('Not found: the argument entry');
	await sleep(700);
}

async function captureScreens(cdp, sessionId) {
	const shots = {};

	// 1. Simple daily mode: just the list, today on top.
	await resetApp(cdp, sessionId);
	await trimList(cdp, sessionId);
	shots.daily = await capture(cdp, sessionId, 'daily');

	// 2. The day report: many small good moments against one bad one.
	await resetApp(cdp, sessionId);
	await clickSelector(cdp, sessionId, `.group-day button[aria-label*=": 12"]`, 'the day header');
	await waitFor(cdp, sessionId, `document.body.textContent.includes('Events that upset me today')`);
	shots.dayReport = await capture(cdp, sessionId, 'day-report');

	// 3. Reflection mode: one of the short questions, half answered.
	await resetApp(cdp, sessionId, { reflection: true });
	await openArgumentEntry(cdp, sessionId);
	await waitFor(cdp, sessionId, `document.querySelector('textarea')`);
	await evaluate(
		cdp,
		sessionId,
		`(() => {
			const textarea = document.querySelector('textarea');
			textarea.value = 'I felt my work was brushed aside in front of everyone.';
			textarea.dispatchEvent(new Event('input', { bubbles: true }));
			return true;
		})()`
	);
	await sleep(400);
	shots.wizard = await capture(cdp, sessionId, 'wizard');

	// 4. After reflecting: the answers and the new score.
	await resetApp(cdp, sessionId, { reflection: true, withProtocol: true });
	await openArgumentEntry(cdp, sessionId);
	await waitFor(cdp, sessionId, `document.body.textContent.includes('brushed aside')`);
	await evaluate(
		cdp,
		sessionId,
		`(() => {
			const question = [...document.querySelectorAll('*')].find(
				(el) => el.children.length === 0 && el.textContent.trim() === 'How does it look now?'
			);
			if (question) {
				question.style.scrollMarginTop = '430px';
				question.scrollIntoView({ block: 'start' });
			}
			return Boolean(question);
		})()`
	);
	await sleep(500);
	shots.reflected = await capture(cdp, sessionId, 'reflected');

	// 5. The archive: days stacked up, each with its own score dots.
	await resetApp(cdp, sessionId);
	await trimList(cdp, sessionId, 3);
	shots.archive = await capture(cdp, sessionId, 'archive');

	return shots;
}

function esc(text) {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function wrap(text, max) {
	return text.split('\n').flatMap((part) => {
		const words = part.split(/\s+/);
		const lines = [];
		let line = '';
		for (const word of words) {
			const next = line ? `${line} ${word}` : word;
			if (next.length > max && line) {
				lines.push(line);
				line = word;
			} else {
				line = next;
			}
		}
		if (line) lines.push(line);
		return lines;
	});
}

function textLines(lines, x, y, size, color, family, weight = 400, lineHeight = 1.12) {
	return lines
		.map(
			(line, index) =>
				`<text x="${x}" y="${y + index * size * lineHeight}" fill="${color}" font-size="${size}" font-family="${family}" font-weight="${weight}">${esc(line)}</text>`
		)
		.join('');
}

async function roundedImage(input, width, height, radius, fit = 'cover') {
	const resized = await sharp(input)
		.resize(width, height, { fit, position: 'top' })
		.png()
		.toBuffer();
	const mask = Buffer.from(
		`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
	);
	return sharp(resized)
		.composite([{ input: mask, blend: 'dest-in' }])
		.png()
		.toBuffer();
}

async function composeFrame(frame, shotPath) {
	const titleLines = wrap(frame.title, frame.title.length > 22 ? 18 : 22);
	const subtitleLines = wrap(frame.subtitle, 34);
	const titleY = 196;
	const subtitleY = titleY + titleLines.length * 72 + 56;

	const topSvg = `
	<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<radialGradient id="top" cx="50%" cy="0%" r="74%">
				<stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.22"/>
				<stop offset="64%" stop-color="${palette.accent}" stop-opacity="0"/>
			</radialGradient>
			<linearGradient id="veil" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="${palette.bg2}"/>
				<stop offset="100%" stop-color="${palette.bg}"/>
			</linearGradient>
			<filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
				<feDropShadow dx="0" dy="42" stdDeviation="34" flood-color="#000" flood-opacity="0.6"/>
			</filter>
		</defs>
		<rect width="100%" height="100%" fill="url(#veil)"/>
		<rect width="100%" height="100%" fill="url(#top)"/>
		<path d="M126 358 C420 270 770 270 1110 354" fill="none" stroke="${palette.accent}" stroke-opacity="0.14" stroke-width="2"/>
		${textLines(titleLines, 118, titleY, 72, palette.text, 'Cormorant Garamond, Georgia, serif', 400, 1.02)}
		${textLines(subtitleLines, 122, subtitleY, 28, palette.soft, 'IBM Plex Sans, Arial, sans-serif', 300, 1.34)}
	</svg>`;

	const shotArea =
		frame.layout === 'manuscript'
			? { x: 330, y: 552, w: 582, h: 2052, r: 10, fit: 'contain', framed: false }
			: frame.shot === 'cast' || frame.shot === 'extended'
				? { x: 178, y: 628, w: 886, h: 1908, r: 58, fit: 'contain', framed: true }
				: { x: 178, y: 650, w: 886, h: 1810, r: 58, fit: 'cover', framed: true };

	const screen = await roundedImage(shotPath, shotArea.w, shotArea.h, shotArea.r, shotArea.fit);
	const backSvg = `
	<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
		${shotArea.framed ? `<g filter="url(#shadow)"><rect x="${shotArea.x - 16}" y="${shotArea.y - 16}" width="${shotArea.w + 32}" height="${shotArea.h + 32}" rx="${shotArea.r + 18}" fill="#080706"/></g>` : ''}
	</svg>`;
	const borderSvg = `
	<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
		${shotArea.framed ? `<rect x="${shotArea.x - 1}" y="${shotArea.y - 1}" width="${shotArea.w + 2}" height="${shotArea.h + 2}" rx="${shotArea.r}" fill="none" stroke="${palette.accent}" stroke-opacity="0.36" stroke-width="2"/>` : ''}
	</svg>`;

	const output = path.join(outputRoot, frame.file);
	await sharp(Buffer.from(topSvg))
		.composite([
			{ input: Buffer.from(backSvg), left: 0, top: 0 },
			{ input: screen, left: shotArea.x, top: shotArea.y },
			{ input: Buffer.from(borderSvg), left: 0, top: 0 }
		])
		.png({ compressionLevel: 9 })
		.toFile(output);
	return output;
}

async function main() {
	await rm(tmpRoot, { recursive: true, force: true });
	await mkdir(tmpRoot, { recursive: true });

	const userDataDir = path.join(tmpRoot, 'chrome-profile');
	const chrome = spawn(chromePath, [
		'--headless=new',
		`--remote-debugging-port=${remotePort}`,
		`--user-data-dir=${userDataDir}`,
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-gpu',
		'--disable-dev-shm-usage',
		'--hide-scrollbars',
		'about:blank'
	]);
	chrome.stderr.on('data', () => {});

	let cdp;
	try {
		const version = await waitForChrome();
		cdp = new Cdp(version.webSocketDebuggerUrl);
		await cdp.connect();
		const sessionId = await createPage(cdp);
		const shots = await captureScreens(cdp, sessionId);
		const outputs = [];
		for (const frame of frames) {
			outputs.push(await composeFrame(frame, shots[frame.shot]));
		}
		console.log(outputs.join('\n'));
	} finally {
		cdp?.close();
		chrome.kill('SIGTERM');
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
