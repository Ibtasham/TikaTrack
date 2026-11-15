/**
 * Download + print helpers.
 *
 * Kept framework-free so they can be called from any component or from tests.
 */

/** Trigger a client-side file download from a string. */
export function downloadTextFile(
  filename: string,
  contents: string,
  mime = 'application/json;charset=utf-8',
): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJSON(filename: string, data: unknown): void {
  downloadTextFile(filename, JSON.stringify(data, null, 2));
}

/** Escape one CSV cell. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build CSV text from rows of cells. */
export function toCSV(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCSV(filename: string, rows: unknown[][]): void {
  // BOM keeps Bangla readable when the CSV is opened in Excel.
  downloadTextFile(filename, `\uFEFF${toCSV(rows)}`, 'text/csv;charset=utf-8');
}

/**
 * Print only the given element.
 *
 * `window.print()` on its own prints the whole app, which is useless for a
 * certificate or a report. This opens a print window containing just the node
 * plus the document's stylesheets, and falls back to a CSS-class approach when
 * pop-ups are blocked.
 */
export function printElement(element: HTMLElement, title = 'TikaTrack'): boolean {
  const markup = element.outerHTML;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return false;
  }

  doc.open();
  doc.write(`<!doctype html><html lang="${document.documentElement.lang || 'en'}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${styles}
<style>
  body { margin: 24px; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  .no-print { display: none !important; }
  @page { margin: 14mm; }
</style>
</head>
<body>${markup}</body></html>`);
  doc.close();

  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      cleanup();
    }
  };
  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    setTimeout(start, 150);
  } else {
    frame.onload = () => setTimeout(start, 150);
  }
  return true;
}

/** Copy text to the clipboard, with a `document.execCommand` fallback. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
