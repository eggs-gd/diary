<script lang="ts">
	import { base } from '$app/paths';
	import Seo from '$lib/Seo.svelte';
	import { reopenConsent } from '$lib/analytics/consent';
	import { HOME_DESCRIPTION, HOME_TITLE, jsonLdHome } from '$lib/seo';

	const screenshots = [
		{
			src: 'appstore-01-daily.png',
			alt: 'A day in the journal: short entries, each with a small score'
		},
		{
			src: 'appstore-02-day-report.png',
			alt: 'The day report: events that brought joy and events that upset, with the day score on top'
		},
		{
			src: 'appstore-03-look-closer.png',
			alt: 'Reflection mode: one short question about an upsetting event'
		},
		{
			src: 'appstore-04-see-it-differently.png',
			alt: 'The answers to the reflection questions and the score given again'
		},
		{
			src: 'appstore-05-archive.png',
			alt: 'The archive: earlier days, each with its own score'
		}
	];

	const features = [
		'One-tap capture of any event or act',
		'A day report that adds everything up',
		'Optional reflection: a few short questions and a second score',
		'Send any entry to the I Ching for another point of view',
		'Archive and calendar',
		'On iOS and Android, the system share sheet sends messages, notes and quotes straight in',
		'English and Ukrainian',
		'No account required, your archive stays on your device',
		'Optional sync across your devices, with the full history kept',
		'No social features, no feeds, no notifications'
	];
</script>

{#snippet storeButtons(placement: string)}
	<div class="store-buttons" aria-label="Get the app">
		<a class="badge" aria-disabled="true">
			<svg class="badge-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M16.37 1.43c0 1.13-.42 2.19-1.12 2.98-.77.88-2.03 1.56-3.06 1.48-.13-1.1.42-2.26 1.09-3.01.77-.86 2.1-1.5 3.09-1.45zM20.9 17.1c-.55 1.27-.81 1.84-1.52 2.96-1 1.55-2.39 3.49-4.11 3.5-1.53.02-1.92-.98-3.99-.97-2.07.01-2.5.99-4.03.96-1.72-.01-3.04-1.76-4.03-3.32-2.77-4.35-3.06-9.46-1.35-12.18 1.21-1.94 3.13-3.07 4.93-3.07 1.84 0 3 .98 4.52.98 1.48 0 2.38-.98 4.51-.98 1.61 0 3.32.88 4.53 2.39-3.98 2.17-3.33 7.85.07 9.75z"
				/>
			</svg>
			<span class="badge-text">
				<small>Download on the</small>
				App Store
			</span>
		</a>
		<a class="badge" aria-disabled="true">
			<svg class="badge-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M3.6 2.3a1 1 0 0 0-.6.92v17.56a1 1 0 0 0 .6.92l9.94-9.7zM14.94 12.94l2.63 2.57 3.44-1.9c.92-.5.92-1.72 0-2.22l-3.44-1.9zM13.9 11.9l2.44-2.38L5.58 3.2zM5.58 20.8l10.76-6.32-2.44-2.38z"
				/>
			</svg>
			<span class="badge-text">
				<small>Get it on</small>
				Google Play
			</span>
		</a>
		<a
			class="badge pwa"
			href="{base}/pwa/"
			rel="external"
			data-cta="web_app"
			data-cta-placement={placement}
		>
			<svg
				class="badge-logo"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 3v11" />
				<path d="m8 10 4 4 4-4" />
				<path d="M4 20h16" />
			</svg>
			<span class="badge-text">
				<small>Open the</small>
				Web App
			</span>
		</a>
	</div>
{/snippet}

<Seo title={HOME_TITLE} description={HOME_DESCRIPTION} path="/" jsonLd={jsonLdHome} />

<main class="page">
	<section class="intro" aria-labelledby="app-title">
		<div class="title-row">
			<p class="glyphs" aria-hidden="true">觀明</p>
			<h1 id="app-title">Attention Journal</h1>
		</div>
		<p class="promo">
			Not a diary — a place to jot down what caught your attention, even the smallest things,
			<br />
			and to see how the day really went.
		</p>
		<p class="lede">
			A single unpleasant moment can overshadow a whole day. Written down, the day adds up
			differently.
		</p>
		{@render storeButtons('hero')}
	</section>

	<section class="screenshots" aria-label="Screenshots">
		{#each screenshots as screenshot}
			<a href="{base}/screenshots/{screenshot.src}" target="_blank" rel="noopener">
				<img
					src="{base}/screenshots/{screenshot.src}"
					alt={screenshot.alt}
					title="Open full size"
					width="1242"
					height="2688"
				/>
			</a>
		{/each}
	</section>

	<section class="description" aria-label="App description">
		<p>
			Attention Journal is a quiet, simple tool for noticing what catches your attention, and the
			story you tell yourself about it.
		</p>

		<h2>Two ways to use it</h2>

		<p>
			<strong>Daily.</strong> Jot down events and things you did, one line each, with a quick score for
			how it landed. That is already enough. At the end of the day the report adds everything up, and
			big swings count for less than they feel: one bad moment does not outweigh many small good ones.
			A day that felt rough can turn out fine.
		</p>

		<p>
			<strong>Reflection.</strong> Switch on reflection mode to look closer at an entry: up to four short
			questions (what upset or pleased you, what it says about you, other ways to see it, what you will
			do next time), then score it again. Sometimes the second score is very different from the first.
		</p>

		<h2>A look from the side</h2>

		<p>
			Any entry can be sent, as it is, to the <a href="https://iching.eggs.gd">I Ching</a>: its web
			app opens with your entry as the question and casts a hexagram at once. It is not an answer,
			only another angle on the same moment, and nothing changes in your journal.
		</p>

		<div class="more">
			<h2>Why so short</h2>

			<p>
				The approach is inspired by the thought records used in cognitive behavioural therapy,
				heavily simplified. A full worksheet can ask ten questions for a single emotion. This asks a
				few, on purpose: it is built for casual daily use, so that capturing even the smallest thing
				stays easy.
			</p>

			<h2>What it is not</h2>

			<p>
				It is not therapy, medical advice or a complete method, and it does not diagnose or treat
				anything. It is a personal reflection tool. If you are struggling, please talk to a
				professional.
			</p>

			<h2>Your data</h2>

			<p>
				Your archive stays on your device by default, in one calm stream. No account is needed. Sync
				across your devices is optional, and when you turn it on the whole history comes along.
			</p>

			<h2>What is in it</h2>

			<ul>
				{#each features as feature}
					<li>{feature}</li>
				{/each}
			</ul>

			<h2>Questions</h2>

			<p>
				<strong>Is this CBT?</strong> It borrows the shape of a thought record and cuts it down. It is
				not a substitute for CBT.
			</p>

			<p>
				<strong>Is it free?</strong> Yes, and it works in the browser: open the web app below.
			</p>
		</div>

		<p class="closing">
			Capture it.
			<br />
			Return to it.
			<br />
			See it clearly.
		</p>

		{@render storeButtons('badges')}
	</section>

	<footer>
		<span>© 2026 earwiG Games</span>
		<a href="https://eggs.gd">eggs.gd</a>
		<a href="{base}/privacy">Privacy Policy</a>
		<button type="button" class="cookie-link" onclick={reopenConsent}>Cookie settings</button>
	</footer>
</main>
