<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy Policy · Attention Journal</title>
	<meta
		name="description"
		content="Privacy Policy for Attention Journal. Last updated: September 2026."
	/>
</svelte:head>

<main class="policy-page">
	<a class="back-link" href="{base}/">Attention Journal</a>

	<article class="policy">
		<h1>Privacy Policy</h1>
		<p class="updated">Last updated: September 2026</p>

		<p>Attention Journal respects your privacy.</p>

		<p>
			The app works fully without an account. By default, your events, reflections, and journal
			entries are stored only on your device and are not transmitted to our servers.
		</p>

		<h2>Optional sync</h2>

		<p>
			You may choose to sign in with Google to sync your journal across your devices. If you do,
			your events and reflections — together with your Google account identifier, name, and email
			address — are stored in Google Firebase (Realtime Database) under your account, so that your
			signed-in devices can share the same journal.
		</p>

		<p>
			Signing out stops syncing on that device but does not delete the copy already stored in
			Firebase. To have your synced data removed, contact us at the address below.
		</p>

		<h2>Analytics</h2>

		<p>
			The app uses Firebase Analytics to collect anonymous usage statistics. This information helps
			improve the app and may include events such as app launches, screen views, and feature usage.
			No personally identifiable information is collected through analytics.
		</p>

		<p>
			The app does not sell personal data to third parties, and does not use advertising networks.
		</p>

		<p>
			If future versions introduce purchases or additional data collection, this Privacy Policy will
			be updated accordingly.
		</p>

		<h2>Contact</h2>
		<p><a href="mailto:eggs.gd@gmail.com">eggs.gd@gmail.com</a></p>

		<h2>Website</h2>
		<p><a href="https://journal.eggs.gd">https://journal.eggs.gd</a></p>
	</article>
</main>
