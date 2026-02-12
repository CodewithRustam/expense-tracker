import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { ExpenseService, SettlementDetail } from 'src/app/services/expense';
import { Toastservice } from 'src/app/services/toastservice';

interface SettlementResponse {
  success: boolean;
  message?: string;
  data?: {
    settlements: SettlementDetail[];
  };
}

@Component({
  selector: 'app-settle-expense-modal',
  templateUrl: './settle-expense-modal.component.html',
  styleUrls: ['./settle-expense-modal.component.scss'],
  standalone: false
})
export class SettleExpenseModalComponent implements OnInit {
  @Input() user!: { memberId: number; memberName: string; netBalance: number };
  @Input() roomId!: number;
  @Input() formattedMonth!: string;

  settlementDetails: SettlementDetail[] = [];
  filteredMembers: SettlementDetail[] = [];
  selectedMember: SettlementDetail | null = null;
  isLoading = true;

  constructor(
    private modalCtrl: ModalController,
    private expenseService: ExpenseService,
    private toast: Toastservice
  ) { }

  ngOnInit() {
    this.loadSettlementDetails();
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

  closeModal() {
    this.modalCtrl.dismiss();
  }

  onMemberChange() {
    console.log('Selected member:', this.selectedMember);
  }
}
