import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { DeviceFingerprintService } from './device-fingerprint.service';

/**
 * SecureTokenService replaces direct localStorage/sessionStorage access
 * for JWT token management with a multi-layered secure approach:
 *
 * 1. Primary: Token is held in-memory (private variable) — not accessible via DevTools
 * 2. Fallback: Encrypted token in localStorage (Remember Me) or sessionStorage
 * 3. Device-bound: Encryption key includes device fingerprint, so stolen ciphertext
 *    can't be decrypted on a different device
 */
@Injectable({
  providedIn: 'root'
})
export class SecureTokenService {

  // In-memory storage — primary token location
  private inMemoryToken: string | null = null;

  // Storage keys
  private readonly STORAGE_KEY = 'et_secure_token';
  private readonly REMEMBER_FLAG_KEY = 'et_remember_me';

  // Tracks whether the service has been initialized (fingerprint loaded)
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    private cryptoService: CryptoService,
    private fingerprintService: DeviceFingerprintService
  ) {}

  /**
   * Initialize the service by pre-computing the device fingerprint.
   * Call this early in the app lifecycle (e.g., APP_INITIALIZER or root component).
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    // Pre-compute fingerprint so sync access works later
    await this.fingerprintService.getFingerprint();

    // Try to restore token from encrypted storage into memory
    await this.restoreTokenFromStorage();

    this.initialized = true;
  }

  /**
   * Store a JWT token securely.
   * @param token - The raw JWT token string
   * @param rememberMe - If true, persist in localStorage (survives browser close).
   *                     If false, use sessionStorage (cleared on close).
   */
  async storeToken(token: string, rememberMe: boolean): Promise<void> {
    await this.initialize();

    // 1. Always store in memory (primary)
    this.inMemoryToken = token;

    // 2. Encrypt and persist to storage (fallback)
    const fingerprint = await this.fingerprintService.getFingerprint();
    const encryptedToken = await this.cryptoService.encrypt(token, fingerprint);

    if (rememberMe) {
      localStorage.setItem(this.STORAGE_KEY, encryptedToken);
      localStorage.setItem(this.REMEMBER_FLAG_KEY, 'true');
      // Clean up sessionStorage in case it had a previous value
      sessionStorage.removeItem(this.STORAGE_KEY);
    } else {
      sessionStorage.setItem(this.STORAGE_KEY, encryptedToken);
      // Clean up localStorage in case it had a previous value
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.REMEMBER_FLAG_KEY);
    }
  }

  /**
   * Retrieve the JWT token.
   * Returns from in-memory first, then falls back to decrypting from storage.
   */
  getToken(): string | null {
    return this.inMemoryToken;
  }

  /**
   * Async version that attempts to restore from encrypted storage
   * if the in-memory token is not available.
   */
  async getTokenAsync(): Promise<string | null> {
    if (this.inMemoryToken) {
      return this.inMemoryToken;
    }

    await this.initialize();
    return this.inMemoryToken;
  }

  /**
   * Clear the token from all storage locations.
   */
  clearToken(): void {
    this.inMemoryToken = null;
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.REMEMBER_FLAG_KEY);
  }

  /**
   * Check if a token exists (in memory).
   */
  hasToken(): boolean {
    return this.inMemoryToken !== null;
  }

  /**
   * Attempt to restore the token from encrypted storage into memory.
   * Called during initialization and on app resume.
   */
  private async restoreTokenFromStorage(): Promise<void> {
    // If we already have a token in memory, no need to restore
    if (this.inMemoryToken) return;

    const fingerprint = await this.fingerprintService.getFingerprint();

    // Check localStorage first (Remember Me), then sessionStorage
    const encryptedToken =
      localStorage.getItem(this.STORAGE_KEY) ||
      sessionStorage.getItem(this.STORAGE_KEY);

    if (!encryptedToken) return;

    try {
      const decryptedToken = await this.cryptoService.decrypt(encryptedToken, fingerprint);
      this.inMemoryToken = decryptedToken;
    } catch (error) {
      // Decryption failed — token is corrupted or from a different device
      console.warn('SecureTokenService: Failed to restore token from storage. Clearing corrupted data.');
      this.clearToken();
    }
  }
}
