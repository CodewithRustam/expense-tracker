import { Injectable } from '@angular/core';

/**
 * DeviceFingerprintService generates a lightweight fingerprint
 * from browser/device characteristics to bind JWT tokens to the device.
 *
 * This makes stolen tokens significantly harder to use on a different
 * device/browser because the fingerprint won't match during decryption.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceFingerprintService {

  private cachedFingerprint: string | null = null;

  /**
   * Get the device fingerprint (cached after first computation).
   * Returns the fingerprint synchronously if already computed,
   * otherwise computes it asynchronously.
   */
  async getFingerprint(): Promise<string> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    this.cachedFingerprint = await this.generateFingerprint();
    return this.cachedFingerprint;
  }

  /**
   * Get the cached fingerprint synchronously.
   * Must call getFingerprint() at least once before using this.
   * Falls back to a default if not yet initialized.
   */
  getFingerprintSync(): string {
    return this.cachedFingerprint || 'not-initialized';
  }

  /**
   * Generate a SHA-256 hash of collected device characteristics.
   */
  private async generateFingerprint(): Promise<string> {
    const components = this.collectComponents();
    const raw = components.join('|||');

    // Create a SHA-256 hash of the combined components
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert hash to hex string
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Collect stable device/browser characteristics.
   * These should be relatively stable across sessions for the same device.
   */
  private collectComponents(): string[] {
    const components: string[] = [];

    // User agent string
    components.push(navigator.userAgent || 'unknown-ua');

    // Screen characteristics
    components.push(`${screen.width}x${screen.height}`);
    components.push(`${screen.colorDepth}`);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown-tz');

    // Language
    components.push(navigator.language || 'unknown-lang');

    // Platform
    components.push(navigator.platform || 'unknown-platform');

    // Hardware concurrency (number of CPU cores)
    components.push(`${navigator.hardwareConcurrency || 0}`);

    // Device pixel ratio
    components.push(`${window.devicePixelRatio || 1}`);

    return components;
  }
}
