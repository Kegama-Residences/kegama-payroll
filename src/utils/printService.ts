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
      printHtml?: (html: string, title?: string) => void;
    };
  }
}

/**
 * Standard paper for PH payroll: US Letter portrait, 4mm margins.
 * (README previously said A4 — standardized to Letter to match
 * MainActivity NA_LETTER + existing CSS + PH payroll practice.)
 */
export const PRINT_PAPER = 'letter' as const;

function buildIsolatedPrintHtml(sourceHtml: string, title: string): string {
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  const safeTitle = title.replace(/[<>&"]/g, '');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    ${headStyles}
    <style>
      @page { size: letter portrait; margin: 4mm; }
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        text-shadow: none !important;
        box-shadow: none !important;
        filter: none !important;
        backdrop-filter: none !important;
      }
      html, body {
        background: #ffffff !important;
        color: #0f172a !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      .no-print, .print-hide, nav, header, aside, button { display: none !important; }
      .letter-4up-page {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        grid-template-rows: repeat(2, 1fr) !important;
        gap: 3mm !important;
        height: 268mm !important;
        max-height: 268mm !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        page-break-after: always;
        break-after: page;
      }
      .letter-4up-page:last-child { page-break-after: auto; break-after: auto; }
      .payslip-print-sheet {
        display: block !important;
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 16px !important;
        background: #ffffff !important;
        page-break-after: always;
        break-after: page;
      }
      .payslip-print-sheet:last-child, .page-break:last-child { page-break-after: auto; break-after: auto; }
      .page-break { page-break-after: always; break-after: page; }
      img { max-width: 100% !important; }
    </style>
  </head>
  <body class="bg-white text-slate-900">
    <div class="print-container" style="background:#ffffff; width:100%; margin:0; padding:0;">
      ${sourceHtml}
    </div>
  </body>
</html>`;
}

async function waitForRender(iframeDoc: Document, timeoutMs = 2500): Promise<void> {
  try {
    const fontsReady = (iframeDoc as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    const images = Array.from(iframeDoc.images || []);
    await Promise.race([
      (async () => {
        if (fontsReady) await fontsReady.catch(() => {});
        await Promise.all(
          images.map((img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                  setTimeout(() => resolve(), 1200);
                }),
          ),
        );
        // One frame so grid/QR layout settles
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
      })(),
      new Promise((r) => setTimeout(r, timeoutMs)),
    ]);
  } catch {
    /* best-effort */
  }
}

export type PrintResult = { ok: boolean; via: 'native-html' | 'native-webview' | 'iframe' | 'window'; error?: string };

/**
 * Production print coordinator:
 * 1. Native Android isolated WebView (`printHtml`) when available
 * 2. Legacy native `print()` with DOM isolation
 * 3. Desktop/WebView isolated iframe (waits for fonts + QR images)
 */
export function printElement(elementId: string, jobTitle = 'Kegama Payslip'): Promise<PrintResult> {
  return new Promise((resolve) => {
    triggerHapticFeedback();
    const sourceEl = document.getElementById(elementId);
    if (!sourceEl) {
      console.error(`[PrintService] Element "${elementId}" not found.`);
      try {
        window.print();
        resolve({ ok: true, via: 'window', error: 'element-missing-fallback' });
      } catch (e: unknown) {
        resolve({ ok: false, via: 'window', error: e instanceof Error ? e.message : 'print failed' });
      }
      return;
    }

    const isolatedHtml = buildIsolatedPrintHtml(sourceEl.outerHTML, jobTitle);

    if (window.NativeAndroidPrinter?.printHtml) {
      try {
        window.NativeAndroidPrinter.printHtml(isolatedHtml, jobTitle);
        resolve({ ok: true, via: 'native-html' });
        return;
      } catch (e) {
        console.warn('[PrintService] native printHtml failed, falling back:', e);
      }
    }

    if (window.NativeAndroidPrinter?.print) {
      try {
        document.body.classList.add('android-printing-active');
        sourceEl.classList.add('android-print-target');
        window.NativeAndroidPrinter.print();
        setTimeout(() => {
          document.body.classList.remove('android-printing-active');
          sourceEl.classList.remove('android-print-target');
          resolve({ ok: true, via: 'native-webview' });
        }, 1500);
        return;
      } catch (e) {
        document.body.classList.remove('android-printing-active');
        sourceEl.classList.remove('android-print-target');
        console.warn('[PrintService] native print failed, falling back to iframe:', e);
      }
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', jobTitle);
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      try {
        window.print();
      } catch { /* noop */ }
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      resolve({ ok: true, via: 'window', error: 'iframe-unavailable' });
      return;
    }

    iframeDoc.open();
    iframeDoc.write(isolatedHtml);
    iframeDoc.close();

    void waitForRender(iframeDoc).then(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('[PrintService] iframe print failed:', e);
        try {
          window.print();
        } catch { /* noop */ }
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        resolve({ ok: true, via: 'iframe' });
      }, 1000);
    });
  });
}

/** Back-compat: previous callers used boolean. */
export async function printElementLegacy(elementId: string, jobTitle?: string): Promise<boolean> {
  const r = await printElement(elementId, jobTitle);
  return r.ok;
}
