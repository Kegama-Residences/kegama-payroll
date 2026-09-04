import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type ScanCallback = (scannedText: string) => void;

class ScannerService {
  private html5QrCode: Html5Qrcode | null = null;
  private isScanning = false;
  private isCapacitorNative = Capacitor.isNativePlatform();

  isNative(): boolean {
    return this.isCapacitorNative;
  }

  async checkPermissions(): Promise<boolean> {
    if (this.isCapacitorNative) {
      try {
        const { camera } = await BarcodeScanner.checkPermissions();
        if (camera === 'granted') return true;
        const req = await BarcodeScanner.requestPermissions();
        return req.camera === 'granted';
      } catch (e) {
        console.warn('Native permission check failed:', e);
        return false;
      }
    } else {
      // Browser environment
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Stop stream immediately after permission check
          stream.getTracks().forEach((track) => track.stop());
          return true;
        } catch (e) {
          console.warn('Browser camera permission denied or unavailable:', e);
          return false;
        }
      }
      return false;
    }
  }

  async startNativeScanner(onScan: ScanCallback): Promise<void> {
    const granted = await this.checkPermissions();
    if (!granted) {
      throw new Error('Camera permission not granted');
    }

    document.querySelector('body')?.classList.add('barcode-scanner-active');

    // Add listener
    await BarcodeScanner.addListener('barcodesScanned', (result) => {
      if (result.barcodes && result.barcodes.length > 0) {
        const raw = result.barcodes[0].rawValue;
        if (raw) {
          onScan(raw);
        }
      }
    });

    await BarcodeScanner.startScan();
    this.isScanning = true;
  }

  async stopNativeScanner(): Promise<void> {
    try {
      document.querySelector('body')?.classList.remove('barcode-scanner-active');
      await BarcodeScanner.removeAllListeners();
      await BarcodeScanner.stopScan();
      this.isScanning = false;
    } catch (e) {
      console.warn('Error stopping native scanner:', e);
    }
  }

  async startWebScanner(elementId: string, onScan: ScanCallback): Promise<void> {
    if (this.html5QrCode && this.isScanning) {
      return;
    }

    const html5QrCode = new Html5Qrcode(elementId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
      ],
      verbose: false,
    });

    this.html5QrCode = html5QrCode;

    const qrConfig = {
      fps: 15,
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1.333,
    };

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        qrConfig,
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // Ignore frequent frame scan misses
        }
      );
      this.isScanning = true;
    } catch (err) {
      console.warn('Failed to start environment camera, trying default video source...', err);
      // Fallback to any available video input
      await html5QrCode.start(
        { facingMode: 'user' },
        qrConfig,
        (decodedText) => {
          onScan(decodedText);
        },
        () => {}
      );
      this.isScanning = true;
    }
  }

  async stopWebScanner(): Promise<void> {
    if (this.html5QrCode) {
      try {
        if (this.html5QrCode.isScanning) {
          await this.html5QrCode.stop();
        }
        await this.html5QrCode.clear();
      } catch (e) {
        console.warn('Error stopping web scanner:', e);
      } finally {
        this.html5QrCode = null;
        this.isScanning = false;
      }
    }
  }

  async stopAll(): Promise<void> {
    if (this.isCapacitorNative) {
      await this.stopNativeScanner();
    } else {
      await this.stopWebScanner();
    }
  }
}

export const scannerService = new ScannerService();
