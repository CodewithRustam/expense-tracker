import { registerPlugin } from '@capacitor/core';

/**
 * TypeScript interface for the native UpiPayment Capacitor plugin.
 * Maps to @CapacitorPlugin(name = "UpiPayment") on the Android side.
 */
export interface UpiPaymentPlugin {
  startPayment(options: {
    /** Payee VPA — leave empty to let user pick inside UPI app */
    pa?: string;
    /** Payee name — optional display hint */
    pn?: string;
    /** Amount in decimal string e.g. "500.00" */
    am: string;
    /** Currency code, defaults to INR */
    cu?: string;
    /** Transaction note shown in UPI app */
    tn?: string;
    /** Your internal transaction reference ID */
    tr?: string;
  }): Promise<UpiPaymentResult>;
}

export interface UpiPaymentResult {
  /** Transaction status: SUCCESS, FAILURE, SUBMITTED, CANCELLED, or UNKNOWN */
  status: string;
  /** UTR — the UPI transaction reference number (the value we auto-capture) */
  txnRef: string;
  /** UPI transaction ID from the PSP */
  txnId: string;
  /** Bank approval reference number */
  approvalRefNo: string;
  /** Raw response string from the UPI app */
  rawResponse: string;
}

/**
 * Register the plugin. The name 'UpiPayment' must exactly match
 * the @CapacitorPlugin(name = "UpiPayment") annotation in Java.
 */
export const UpiPayment = registerPlugin<UpiPaymentPlugin>('UpiPayment');
