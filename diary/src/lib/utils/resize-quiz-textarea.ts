export interface ResizeQuizTextareaOptions {
	minLines?: number;
	bufferLines?: number;
	hiddenClass?: string;
}

const lineHeights = new WeakMap<HTMLTextAreaElement, number>();

function getLineHeight(el: HTMLTextAreaElement): number {
	const cached = lineHeights.get(el);
	if (cached !== undefined) return cached;

	const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
	const resolved = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 24;
	lineHeights.set(el, resolved);
	return resolved;
}

export function resizeTextareaToContent(el: HTMLTextAreaElement): void {
	el.style.height = 'auto';
	const lineHeight = getLineHeight(el);
	const contentLines = Math.max(1, Math.ceil(el.scrollHeight / lineHeight));
	el.style.height = `${contentLines * lineHeight}px`;
}

/** Auto-height for quiz fields: min 2 lines, or content + 1 buffer line. */
export function resizeQuizTextarea(
	el: HTMLTextAreaElement,
	wrap: HTMLDivElement,
	{ minLines = 2, bufferLines = 1, hiddenClass = 'quiz-input--hidden' }: ResizeQuizTextareaOptions = {}
): void {
	const hidden = el.classList.contains(hiddenClass);

	wrap.style.minHeight = '';

	if (hidden) {
		el.style.position = 'static';
		el.style.opacity = '0';
		el.style.pointerEvents = 'none';
	}

	el.style.height = '0';

	const lineHeight = getLineHeight(el);
	const contentLines = Math.max(1, Math.ceil(el.scrollHeight / lineHeight));
	const totalLines = Math.max(minLines, contentLines + bufferLines);
	const height = `${totalLines * lineHeight}px`;

	wrap.style.minHeight = height;
	el.style.height = height;

	if (hidden) {
		el.style.position = '';
		el.style.opacity = '';
		el.style.pointerEvents = '';
	}
}
