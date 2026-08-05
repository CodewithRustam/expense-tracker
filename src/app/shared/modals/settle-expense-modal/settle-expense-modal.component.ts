import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { SettlementDetail } from 'src/app/core/models/Settlement/SettlementDetail';
import { ExpenseService } from 'src/app/core/services/expense';
import { Toastservice } from 'src/app/core/services/toastservice';
import { UpiService } from 'src/app/core/services/upi.service';
import { UpiSettlementRequest } from 'src/app/core/models/Settlement/UpiSettlementRequest';
import { QrScannerModalComponent, QrScanResult } from '../qr-scanner-modal/qr-scanner-modal.component';

export interface SettlementResponse {
  success: boolean;
  message?: string;
  data?: {
    settlements: SettlementDetail[];
  };
}

@Component({
  selector: 'app-settle-expense-modal',
  templateUrl: './settle-expense-modal.component.html',
  standalone: false
})
export class SettleExpenseModalComponent implements OnInit {
  @Input() user!: { memberId: number; memberName: string; netBalance: number };
  @Input() roomId!: number;
  @Input() formattedMonth!: string;

  @Input() preloadedSettlements: SettlementDetail[] = [];
  @Input() isPreloaded = false;

  settlementDetails: SettlementDetail[] = [];
  filteredMembers: SettlementDetail[] = [];
  selectedMember: SettlementDetail | null = null;
  isLoading = true;

  /** UPI payment state */
  isProcessingUpi = false;
  isUpiAvailable = false;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private expenseService: ExpenseService,
    private toast: Toastservice,
    private upiService: UpiService
  ) {
    this.isUpiAvailable = this.upiService.isUpiAvailable();
  }

  ngOnInit() {
    if (this.isPreloaded && this.preloadedSettlements.length > 0) {
      this.settlementDetails = this.preloadedSettlements;
      this.filteredMembers = [...this.settlementDetails];
      this.selectedMember = this.settlementDetails[0] ?? null; // or find logic
      this.isLoading = false;
    } else {
      this.loadSettlementDetails(); // fallback — keep your original method
    }
  }

  filterMembers(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (!searchTerm) {
      this.filteredMembers = [...this.settlementDetails];
    } else {
      this.filteredMembers = this.settlementDetails.filter(detail =>
        detail.toMemberName.toLowerCase().includes(searchTerm)
      );
    }
  }

  loadSettlementDetails() {
    this.isLoading = true;
    this.expenseService
      .getSettlementDetails(this.roomId, this.user.memberId, this.formattedMonth)
      .subscribe({
        next: (response: SettlementResponse) => {
          this.settlementDetails = response?.data?.settlements || [];
          this.filteredMembers = [...this.settlementDetails];
          this.selectedMember = this.settlementDetails.find(x => x.toMemberName) ?? null;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error fetching settlement details:', error);
          this.isLoading = false;
        },
      });
  }

  confirmSettlement() {
    if (this.selectedMember) {
      this.expenseService.settleBalance(
        this.selectedMember,
        this.roomId,
        this.user.memberName,
        this.formattedMonth
      ).subscribe({
        next: () => {
          this.toast.success('Settlement successful!');
          this.modalCtrl.dismiss({ confirmed: true });
        },
        error: () => {
          this.toast.error('Settlement failed. Please try again.');
        }
      });
    }
  }

  /**
   * Triggers the native UPI payment flow:
   * 1. Asks for receiver's UPI ID if not pre-filled (required by NPCI/GPay)
   * 2. Opens the Android UPI app chooser (GPay, PhonePe, etc.) with payee & amount pre-filled
   * 3. User completes payment inside the UPI app
   * 4. On return, auto-captures the UTR from the OS-level response
   * 5. Silently sends the UTR to the backend for verification
   */
  /**
   * Opens the in-app Camera QR Scanner.
   * User scans the receiver's Google Pay / PhonePe / Paytm QR code.
   * The app decodes the receiver's UPI ID (pa) and launches the UPI payment intent.
   */
  async scanAndPay() {
    if (!this.selectedMember || this.isProcessingUpi) return;

    const modal = await this.modalCtrl.create({
      component: QrScannerModalComponent,
      cssClass: 'qr-scanner-modal-sheet'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.success && data?.upiId) {
      const payeeName = data.payeeName || this.selectedMember.toMemberName;
      this.executeUpiPaymentFlow(data.upiId, payeeName);
    } else if (data?.success && data?.rawText) {
      // Fallback if raw text was scanned
      this.executeUpiPaymentFlow(data.rawText, this.selectedMember.toMemberName);
    }
  }

  /**
   * Legacy / fallback method for direct UPI payment
   */
  async payViaUpi() {
    if (!this.selectedMember || this.isProcessingUpi) return;

    let targetUpiId = this.selectedMember.upiId || '';

    // Prompt for UPI ID if not pre-filled
    if (!targetUpiId) {
      const alert = await this.alertCtrl.create({
        header: 'Enter Receiver UPI ID',
        message: `Enter the UPI ID of ${this.selectedMember.toMemberName} (e.g. john@upi or 9876543210@ybl):`,
        inputs: [
          {
            name: 'upiId',
            type: 'text',
            placeholder: 'e.g. username@okicici',
            value: ''
          }
        ],
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Proceed', role: 'ok' }
        ]
      });

      await alert.present();
      const { data, role } = await alert.onDidDismiss();

      if (role !== 'ok' || !data?.values?.upiId?.trim()) {
        return; // User cancelled or entered blank
      }

      targetUpiId = data.values.upiId.trim();
    }

    if (!targetUpiId) return;

    this.executeUpiPaymentFlow(targetUpiId, this.selectedMember.toMemberName);
  }

  /**
   * Executes the full UPI intent + auto-UTR capture flow
   */
  private async executeUpiPaymentFlow(targetUpiId: string, payeeName: string) {
    if (!this.selectedMember) return;

    this.isProcessingUpi = true;

    try {
      const amount = this.selectedMember.amount.toFixed(2);
      const note = `SplitX settlement to ${this.selectedMember.toMemberName}`;
      const internalRef = `SPLITX-${this.roomId}-${Date.now()}`;

      // 1. Fire native UPI intent with payee VPA and payee name
      const result = await this.upiService.initiateUpiPayment(
        amount,
        note,
        internalRef,
        targetUpiId,
        payeeName
      );

      // 2. Handle the response based on status
      switch (result.status?.toUpperCase()) {
        case 'SUCCESS': {
          const utr = result.txnRef || result.approvalRefNo || result.txnId;

          if (!utr) {
            this.toast.error('Payment succeeded but UTR was not returned. Please note your UTR manually.');
            this.isProcessingUpi = false;
            return;
          }

          // 3. Silently submit the UTR to the backend
          const payload: UpiSettlementRequest = {
            roomId: this.roomId,
            payerName: this.user.memberName,
            receiverName: this.selectedMember.toMemberName,
            amount: this.selectedMember.amount,
            utr: utr,
            monthLabel: this.formattedMonth
          };

          this.upiService.submitUtrToBackend(payload).subscribe({
            next: () => {
              this.toast.success('Payment recorded! Pending verification.');
              this.modalCtrl.dismiss({ confirmed: true, upiPaid: true, utr: utr });
            },
            error: () => {
              this.toast.error('Payment succeeded but failed to notify server. UTR: ' + utr);
              this.modalCtrl.dismiss({ confirmed: true, upiPaid: true, utr: utr });
            }
          });
          break;
        }

        case 'SUBMITTED':
          this.toast.success('Payment is pending. It will be verified shortly.');
          break;

        case 'FAILURE':
          this.toast.error('UPI payment failed. Please try again.');
          break;

        case 'CANCELLED':
          // User pressed back — do nothing
          break;

        default:
          this.toast.error('Could not determine payment status. Please check your UPI app.');
          break;
      }
    } catch (err: any) {
      const message = err?.message || 'UPI payment could not be initiated.';
      this.toast.error(message);
    } finally {
      this.isProcessingUpi = false;
    }
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

  onMemberChange() {
    console.log('Selected member:', this.selectedMember);
  }
}
