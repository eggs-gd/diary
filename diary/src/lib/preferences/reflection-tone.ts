import { browser } from '$app/environment';

export type ReflectionTone = 'gentle' | 'aggressive';

export const REFLECTION_TONE_STORAGE_KEY = 'guanming.reflectionTone';

export const REFLECTION_TONE_OPTIONS: ReflectionTone[] = ['gentle', 'aggressive'];

export const DEFAULT_REFLECTION_TONE: ReflectionTone = 'aggressive';

export function parseReflectionTone(value: string): ReflectionTone | null {
	if (value === 'gentle' || value === 'aggressive') return value;
	return null;
}

export function detectReflectionTone(): ReflectionTone {
	if (!browser) return DEFAULT_REFLECTION_TONE;

	const saved = localStorage.getItem(REFLECTION_TONE_STORAGE_KEY);
	const parsed = saved ? parseReflectionTone(saved) : null;
	return parsed ?? DEFAULT_REFLECTION_TONE;
}
