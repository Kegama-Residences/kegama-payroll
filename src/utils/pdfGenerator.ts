import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export function sanitizeFileName(name: string, fallback = 'payslip.pdf'): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
  if (!cleaned) return fallback;
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

async function waitForPayslipAssets(element: HTMLElement, timeoutMs = 2500): Promise<void> {
  try {
    await Promise.race([
      (async () => {
        if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
        const imgs = Array.from(element.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                  setTimeout(() => resolve(), 1200);
                }),
          ),
        );
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
      })(),
      new Promise((r) => setTimeout(r, timeoutMs)),
    ]);
  } catch {
    /* best-effort */
  }
}

export async function generatePayslipPDF(
  elementId: string,
): Promise<{ success: boolean; blob?: Blob; base64?: string; error?: string }> {
  const element = document.getElementById(elementId);
  if (!element) {
    return { success: false, error: 'Payslip element not found in DOM' };
  }

  try {
    await waitForPayslipAssets(element);
    const canvas = await html2canvas(element, {
      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'SLOW');
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'SLOW');
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'SLOW');
        heightLeft -= pageHeight;
      }
    }

    const pdfBlob = pdf.output('blob');
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    return { success: true, blob: pdfBlob, base64: pdfBase64 };
  } catch (error: unknown) {
    console.error('PDF Generation failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to render PDF' };
  }
}

export async function downloadOrSharePDF(
  elementId: string,
  fileName: string,
  shareTitle = 'Employee Payslip',
): Promise<{ success: boolean; message: string }> {
  const safeName = sanitizeFileName(fileName);
  const result = await generatePayslipPDF(elementId);
  if (!result.success || !result.base64 || !result.blob) {
    return { success: false, message: result.error || 'Failed to generate PDF' };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const writeResult = await Filesystem.writeFile({
        path: safeName,
        data: result.base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: shareTitle,
        text: `Payslip: ${safeName}`,
        url: writeResult.uri,
        dialogTitle: 'Share or Print Payslip',
      });
      return { success: true, message: 'Payslip ready and shared' };
    } catch (shareErr) {
      console.warn('Native share failed, falling back to browser download:', shareErr);
    }
  }

  try {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { success: true, message: 'PDF downloaded successfully' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Download error' };
  }
}
