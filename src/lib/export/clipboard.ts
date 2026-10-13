/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Copies rich text (HTML + plain text fallback) to the user's clipboard.
 */
export async function copyToClipboard(
  plainText: string,
  htmlText?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (htmlText && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      try {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
        return { success: true };
      } catch (e) {
        // Fall back to text/plain
        await navigator.clipboard.writeText(plainText);
        return { success: true };
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plainText);
      return { success: true };
    }

    // Legacy fallback using textarea
    const textArea = document.createElement('textarea');
    textArea.value = plainText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      return { success: true };
    }
    return { success: false, error: 'Clipboard copy failed or permission denied' };
  } catch (err: any) {
    console.error('Clipboard error:', err);
    return { success: false, error: err.message || 'Clipboard permission denied' };
  }
}

/**
 * Initiates browser file download for a string blob.
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 150);
}
