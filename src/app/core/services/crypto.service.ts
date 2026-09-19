import { Injectable } from '@angular/core';

/**
 * CryptoService provides AES-GCM encryption/decryption for sensitive data
 * using the browser-native Web Crypto API.
 *
 * The encryption key is derived from a combination of an app-level secret
 * and a device fingerprint, ensuring tokens can only be decrypted on the
 * same device/browser they were encrypted on.
 */
@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  // App-level secret used as part of key derivation.
  // This is NOT a standalone secret — it's combined with the device fingerprint.
  private readonly APP_SECRET = '534547b7246ab0a42795d368685309340cf785c4169520b95263d2059120fe60';

  /**
   * Encrypt a plaintext string using AES-GCM.
   * @param plaintext - The data to encrypt (e.g., a JWT token)
   * @param deviceFingerprint - The device fingerprint to bind the encryption to
   * @returns A base64-encoded string containing the IV + ciphertext
   */
  async encrypt(plaintext: string, deviceFingerprint: string): Promise<string> {
    const key = await this.deriveKey(deviceFingerprint);

    // Generate a random 12-byte IV for each encryption (required by AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV + ciphertext into a single buffer, then base64 encode
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return this.arrayBufferToBase64(combined.buffer);
  }

  /**
   * Decrypt a base64-encoded ciphertext back to plaintext.
   * @param ciphertextBase64 - The base64-encoded IV + ciphertext
   * @param deviceFingerprint - Must match the fingerprint used during encryption
   * @returns The decrypted plaintext string
   */
  async decrypt(ciphertextBase64: string, deviceFingerprint: string): Promise<string> {
    try {
      const key = await this.deriveKey(deviceFingerprint);
      const combined = this.base64ToArrayBuffer(ciphertextBase64);
      const combinedArray = new Uint8Array(combined);

      // Extract the 12-byte IV from the beginning
      const iv = combinedArray.slice(0, 12);
      const ciphertext = combinedArray.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('CryptoService: Decryption failed — token may be corrupted or from a different device');
      throw new Error('DECRYPTION_FAILED');
    }
  }

  /**
   * Derive an AES-GCM key from the app secret + device fingerprint using PBKDF2.
   * This ensures the key is unique per device.
   */
  private async deriveKey(deviceFingerprint: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.APP_SECRET + deviceFingerprint),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Use the device fingerprint as the salt for PBKDF2
    const salt = new TextEncoder().encode(deviceFingerprint);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
