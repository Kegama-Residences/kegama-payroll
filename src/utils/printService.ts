import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function triggerHapticFeedback(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Graceful fallback for web/unsupported
  }
}

declare global {
  interface Window {
    NativeAndroidPrinter?: {
      print: () => void;
    };
  }
}

/**
 * Production-ready Print Coordinator:
 * 1. Calls native Android PrintManager bridge if on native Android
 * 2. Uses isolated iframe for crisp webview / desktop printing
 * 3. Falls back gracefully to window.print()
 */
export function printElement(elementId: string): Promise<boolean> {
  return new Promise((resolve) => {
    triggerHapticFeedback();

    // Check for native Android Bridge
    if (window.NativeAndroidPrinter?.print) {
      try {
        window.NativeAndroidPrinter.print();
        resolve(true);
        return;
      } catch (e) {
        console.warn('Native Android print failed, falling back to web print:', e);
      }
    }

    const sourceEl = document.getElementById(elementId);
    if (!sourceEl) {
      console.error(`Element with id ${elementId} not found.`);
      // Fallback
      window.print();
      resolve(true);
      return;
    }

    // Try iframe printing for clean isolation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'Print Document');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      document.body.removeChild(iframe);
      resolve(true);
      return;
    }

    // Copy styles from head into iframe
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payslip</title>
          ${headStyles}
          <style>
            @page {
              size: letter portrait;
              margin: 5mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${sourceEl.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for images and fonts to render
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print()', e);
        window.print();
      }

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        resolve(true);
      }, 1000);
    }, 400);
  });
}
