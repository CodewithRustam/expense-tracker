import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SettlementDetail } from 'src/app/core/models/Settlement/SettlementDetail';
import { ExpenseService } from 'src/app/core/services/expense';
import { Toastservice } from 'src/app/core/services/toastservice';
import { UpiService } from 'src/app/core/services/upi.service';
import { UpiSettlementRequest } from 'src/app/core/models/Settlement/UpiSettlementRequest';

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
   * 1. Opens the Android UPI app chooser (GPay, PhonePe, etc.)
   * 2. User completes payment inside the UPI app
   * 3. On return, auto-captures the UTR from the OS-level response
   * 4. Silently sends the UTR to the backend for verification
   */
  async payViaUpi() {
    if (!this.selectedMember || this.isProcessingUpi) return;

    this.isProcessingUpi = true;

    try {
      const amount = this.selectedMember.amount.toFixed(2);
      const note = `SplitX settlement to ${this.selectedMember.toMemberName}`;
      const internalRef = `SPLITX-${this.roomId}-${Date.now()}`;

      // 1. Fire the native UPI intent and wait for the response
      const result = await this.upiService.initiateUpiPayment(amount, note, internalRef);

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
