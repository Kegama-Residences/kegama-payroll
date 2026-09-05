import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export async function generatePayslipPDF(
  elementId: string
): Promise<{ success: boolean; blob?: Blob; base64?: string; error?: string }> {
  const element = document.getElementById(elementId);
  if (!element) {
    return { success: false, error: 'Payslip element not found in DOM' };
  }

  try {
    // Create canvas representation of payslip with 2x scale for sharp text & vector look
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Standard A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Center or scale to fit page height if needed
    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
    }

    const pdfBlob = pdf.output('blob');
    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    return {
      success: true,
      blob: pdfBlob,
      base64: pdfBase64,
    };
  } catch (error: any) {
    console.error('PDF Generation failed:', error);
    return { success: false, error: error?.message || 'Failed to render PDF' };
  }
}

export async function downloadOrSharePDF(
  elementId: string,
  fileName: string,
  shareTitle = 'Employee Payslip'
): Promise<{ success: boolean; message: string }> {
  const result = await generatePayslipPDF(elementId);

  if (!result.success || !result.base64 || !result.blob) {
    return { success: false, message: result.error || 'Failed to generate PDF' };
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const path = `${fileName}`;
      const writeResult = await Filesystem.writeFile({
        path,
        data: result.base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: shareTitle,
        text: `Payslip: ${fileName}`,
        url: writeResult.uri,
        dialogTitle: 'Share or Print Payslip',
      });

      return { success: true, message: 'Payslip ready and shared' };
    } catch (shareErr) {
      console.warn('Native share failed, falling back to browser download:', shareErr);
    }
  }

  // Web fallback: direct browser download
  try {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { success: true, message: 'PDF downloaded successfully' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Download error' };
  }
}
