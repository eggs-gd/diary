/**
 * Forward a Journal event into the I Ching PWA as a prefilled question.
 *
 * Follows the PWA-to-PWA deeplink contract from CORE-144 (see
 * `eGGs.gd.prod/i-ching` → `docs/pwa-deeplink.md`), implemented on the I Ching
 * side by CORE-147:
 *
 *     https://iching.eggs.gd/pwa/?q=<url-encoded question>
 *
 * Contract notes we rely on here:
 * - only `q` is sent; there is no `mode` parameter in v1;
 * - `q` is plain user text — the I Ching PWA reads it with
 *   `URLSearchParams.get('q')` (one percent-decode) and trims it;
 * - when `q` is present and non-blank the I Ching PWA prefills the question and
 *   auto-starts a virtual all-coins toss.
 *
 * This is the PWA-side integration only: no native links, app schemes,
 * Universal Links or Capacitor behaviour (out of scope per CORE-145).
 */

/** Base URL of the I Ching PWA deeplink entry point. */
export const ICHING_PWA_URL = 'https://iching.eggs.gd/pwa/';

/**
 * Derive the I Ching question from the event text in the simplest useful way:
 * keep the user-written wording verbatim, only collapsing surrounding and
 * internal whitespace so the generated URL stays readable. No extra phrasing or
 * interpretation is added.
 */
export function ichingQuestionFromEvent(eventText: string): string {
	return eventText.replace(/\s+/g, ' ').trim();
}

/**
 * Build the I Ching PWA deeplink for an event, or `null` when the event has no
 * shareable text (the I Ching side treats a blank `q` as a no-op anyway).
 */
export function buildIchingDeeplink(eventText: string): string | null {
	const question = ichingQuestionFromEvent(eventText);
	if (!question) return null;

	// URLSearchParams encodes the value for a query string (spaces as `+`,
	// which `URLSearchParams.get` decodes back to spaces on the I Ching side).
	const params = new URLSearchParams({ q: question });
	return `${ICHING_PWA_URL}?${params.toString()}`;
}

/**
 * Open the I Ching PWA deeplink for an event in a new tab. Returns `false`
 * (without navigating) when the event has no shareable text. Never mutates the
 * event.
 */
export function shareEventToIching(eventText: string): boolean {
	const url = buildIchingDeeplink(eventText);
	if (!url) return false;

	window.open(url, '_blank', 'noopener,noreferrer');
	return true;
}
