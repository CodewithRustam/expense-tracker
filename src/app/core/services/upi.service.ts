import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { UpiPayment, UpiPaymentResult } from '../plugins/upi-payment.plugin';
import { ApiService } from './api.service';
import { UpiSettlementRequest } from '../models/Settlement/UpiSettlementRequest';

@Injectable({
  providedIn: 'root'
})
export class UpiService {

  constructor(private apiService: ApiService) {}

  /**
   * Checks if the current platform supports native UPI intents.
   * Returns true only on Android native (not web/PWA).
   */
  isUpiAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Triggers the native Android UPI payment intent.
   *
   * The payee VPA (pa) is intentionally omitted — the user selects or enters
   * the payee inside their UPI app (GPay, PhonePe, etc.).
   * The OS-level response (including the UTR) is auto-captured when the UPI app closes.
   *
   * @param amount     - Payment amount as a string (e.g. "500.00")
   * @param note       - Transaction note shown in the UPI app
   * @param internalRef - Your internal reference ID for tracking
   * @returns Promise resolving to the parsed UPI response
   */
  async initiateUpiPayment(
    amount: string,
    note: string,
    internalRef: string
  ): Promise<UpiPaymentResult> {
    if (!this.isUpiAvailable()) {
      throw new Error('UPI payments are only available on Android devices.');
    }

    return UpiPayment.startPayment({
      am: amount,
      cu: 'INR',
      tn: note,
      tr: internalRef
    });
  }

  /**
   * Sends the auto-captured UTR to the backend to mark the settlement
   * as Pending_Verification.
   */
  submitUtrToBackend(payload: UpiSettlementRequest): Observable<any> {
    return this.apiService.post<any>(
      'Expenses/mark-paid',
      payload
    ).pipe(
      catchError((err: any) => {
        return throwError(() => ({
          success: false,
          message: err?.error?.message || 'Failed to submit payment verification.'
        }));
      })
    );
  }
}
