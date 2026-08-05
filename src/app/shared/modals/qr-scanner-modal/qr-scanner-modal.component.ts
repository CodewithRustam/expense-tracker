import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Html5Qrcode } from 'html5-qrcode';

export interface QrScanResult {
  success: boolean;
  upiId?: string;
  payeeName?: string;
  rawText?: string;
}

@Component({
  selector: 'app-qr-scanner-modal',
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.scss'],
  standalone: false
})
export class QrScannerModalComponent implements AfterViewInit, OnDestroy {
  private html5Qrcode?: Html5Qrcode;
  isScanning = false;
  errorMessage = '';

  constructor(private modalCtrl: ModalController) {}

  ngAfterViewInit() {
    this.startScanner();
  }

  async startScanner() {
    this.errorMessage = '';
    try {
      this.html5Qrcode = new Html5Qrcode('qr-reader');
      this.isScanning = true;

      await this.html5Qrcode.start(
        { facingMode: 'environment' }, // Rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText: string) => {
          this.handleDecodedQr(decodedText);
        },
        (_errorMessage: string) => {
          // Ignore transient scan errors per frame
        }
      );
    } catch (err: any) {
      console.error('Camera start error:', err);
      this.isScanning = false;
      this.errorMessage = 'Unable to access camera. Please allow camera permissions.';
    }
  }

  private handleDecodedQr(decodedText: string) {
    // Stop scanner immediately on first successful detection
    this.stopScanner();

    // Parse UPI link e.g. "upi://pay?pa=rahul@okicici&pn=Rahul&am=100"
    const result = this.parseUpiQrText(decodedText);

    this.modalCtrl.dismiss(result);
  }

  /**
   * Helper to parse UPI URI query parameters or plain text UPI ID
   */
  private parseUpiQrText(text: string): QrScanResult {
    if (!text) {
      return { success: false };
    }

    const trimmed = text.trim();

    // 1. Check if it's a UPI URL (upi://pay?...)
    if (trimmed.toLowerCase().startsWith('upi://pay')) {
      try {
        const urlStr = trimmed.replace(/^upi:\/\/pay\?/i, '');
        const params = new URLSearchParams(urlStr);

        const pa = params.get('pa') || '';
        const pn = params.get('pn') || '';

        if (pa) {
          return {
            success: true,
            upiId: pa,
            payeeName: pn,
            rawText: trimmed
          };
        }
      } catch (e) {
        console.warn('UPI URL parse error:', e);
      }
    }

    // 2. Check if text looks like a direct UPI ID (e.g. name@bank or 9876543210@ybl)
    if (trimmed.includes('@')) {
      return {
        success: true,
        upiId: trimmed,
        rawText: trimmed
      };
    }

    // 3. Fallback raw text
    return {
      success: true,
      rawText: trimmed
    };
  }

  private async stopScanner() {
    if (this.html5Qrcode && this.isScanning) {
      try {
        await this.html5Qrcode.stop();
        this.html5Qrcode.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      } finally {
        this.isScanning = false;
      }
    }
  }

  closeModal() {
    this.stopScanner();
    this.modalCtrl.dismiss({ success: false });
  }

  ngOnDestroy() {
    this.stopScanner();
  }
}
