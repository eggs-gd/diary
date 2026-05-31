/**
 * Share or download the archive text.
 *
 * iOS native / mobile  → Web Share API з файлом (.md) → рідний Share Sheet
 * Desktop / fallback   → завантаження .md файлу + копія в буфер
 */
export async function shareArchive(text: string, filename: string): Promise<void> {
	if (typeof navigator === 'undefined') return;

	// ── Mobile / iOS: Web Share API з .md файлом ────────────────────────────
	// canShare({ files }) повертає true тільки на iOS/Android, але не на десктопі
	if (typeof navigator.share === 'function') {
		try {
			const file = new File([text], filename, { type: 'text/markdown' });
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({ files: [file], title: filename });
				return;
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') return;
			// будь-яка інша помилка → fallback до завантаження
		}
	}

	// ── Desktop: завантажити .md + скопіювати в буфер ───────────────────────
	downloadBlob(text, filename);
	void navigator.clipboard?.writeText(text).catch(() => {});
}

function downloadBlob(text: string, filename: string): void {
	const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	// Відкладаємо revoke — браузер повинен встигнути розпочати завантаження
	setTimeout(() => {
		URL.revokeObjectURL(url);
		a.remove();
	}, 2000);
}
