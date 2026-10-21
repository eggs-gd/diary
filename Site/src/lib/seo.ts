export const SITE = 'https://journal.eggs.gd';
export const SITE_NAME = 'Attention Journal';
export const OG_IMAGE = `${SITE}/og.png`;

export const HOME_TITLE = 'Attention Journal 觀明 — a quiet thought journal';
export const HOME_DESCRIPTION =
	'A quiet journal for noticing what catches your attention. Capture an event, return later, and see the story you told yourself.';

export const jsonLdHome = {
	'@context': 'https://schema.org',
	'@type': 'SoftwareApplication',
	name: SITE_NAME,
	url: `${SITE}/`,
	description: HOME_DESCRIPTION,
	applicationCategory: 'LifestyleApplication',
	operatingSystem: 'Web',
	inLanguage: ['en', 'uk'],
	isAccessibleForFree: true,
	publisher: { '@type': 'Organization', name: 'earwiG Games', url: 'https://eggs.gd/' }
};
