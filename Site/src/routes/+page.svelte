<script lang="ts">
	import { base } from '$app/paths';
	import Seo from '$lib/Seo.svelte';
	import { HOME_DESCRIPTION, HOME_TITLE, jsonLdHome } from '$lib/seo';

	const features = [
		'One-tap capture of any event',
		'On iOS and Android, the system share sheet sends messages, notes and quotes straight in',
		'Return later to reflect and reinterpret',
		'Gentle self-respect and reflection prompts',
		'Personal archive with calendar view',
		'English and Ukrainian localization',
		'No accounts required',
		'No social features',
		'No feeds',
		'No notifications'
	];
</script>

<Seo title={HOME_TITLE} description={HOME_DESCRIPTION} path="/" jsonLd={jsonLdHome} />

<main class="page">
	<section class="intro" aria-labelledby="app-title">
		<div class="title-row">
			<p class="glyphs" aria-hidden="true">觀明</p>
			<h1 id="app-title">Attention Journal</h1>
		</div>
		<p class="promo">
			Not a diary — an archive of attention.
			<br />
			Capture the moment, return later, and see it more clearly.
		</p>
	</section>

	<section class="description" aria-label="App description">
		<p>Attention Journal is a quiet companion for reflection, not another journaling app.</p>

		<p>
			Capture an event the instant it happens — a thought, a message, a moment that caught your
			attention. Later, when you are ready, return to it: notice the story you told yourself, and
			ask whether another reading is just as true.
		</p>

		<p>
			It works like a thought journal: write down what happened, return when you are ready, and set
			the story you told yourself beside other readings of the same moment. The approach is inspired
			by the thought records used in cognitive behavioral therapy. Attention Journal is a personal
			reflection tool, not therapy, and it makes no medical claims.
		</p>

		<p>Features:</p>

		<ul>
			{#each features as feature}
				<li>{feature}</li>
			{/each}
		</ul>

		<p>
			While Shape of Momentum looks outward at the form of a moment, 觀明 looks inward at the form
			of perception. Your archive stays on your device by default, in one calm stream. Optional
			sync can mirror it to your other signed-in devices.
		</p>

		<p class="closing">
			Capture it.
			<br />
			Return to it.
			<br />
			See it clearly.
		</p>

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
				data-cta-placement="badges"
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
	</section>

	<footer>
		<span>© 2026 earwiG Games</span>
		<a href="https://eggs.gd">eggs.gd</a>
		<a href="{base}/privacy">Privacy Policy</a>
	</footer>
</main>
