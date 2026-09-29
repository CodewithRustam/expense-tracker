import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ExpenseService } from 'src/app/core/services/expense';
import { Toastservice } from 'src/app/core/services/toastservice';
import { finalize, take } from 'rxjs/operators';
import { ApiExpense, SplitType, ExpenseSplit } from 'src/app/core/models/Expense/ApiExpense';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface RoomMemberSplit {
  memberId: number;
  name: string;
  joinedDate?: string;
  leftDate?: string;
  isSelected: boolean;
  value: number;
  computedAmount: number;
}

interface Expense {
  expenseId: number;
  item: string;
  amount: number;
  roomId: number | null;
  originalDate: string;
  date: string;
  payerId: number;
  payerName: string;
  category: string;
  iconName: string;
  isEditShow: boolean;
  splitType?: SplitType;
  splits?: ExpenseSplit[];
}

@Component({
  selector: 'app-edit-expense-modal',
  templateUrl: './edit-expense-modal.component.html',
  standalone: false,
  encapsulation: ViewEncapsulation.None
})
export class EditExpenseModal implements OnInit {
  @Input() expense!: Expense;
  @Input() groups: { roomId: number; name: string }[] = [];

  SplitType = SplitType;

  showDatePicker: boolean = false;
  today: string = new Date().toISOString().split('T')[0];
  originalExpense!: Expense;
  hasChanges: boolean = false;
  isSubmitting: boolean = false;
  filteredGroups: { roomId: number; name: string }[] = [];
  roomName: string = '';

  // Split Mode States
  selectedSplitType: SplitType = SplitType.Equal;
  roomMembers: RoomMemberSplit[] = [];
  loadingMembers: boolean = false;
  splitStatusMessage: string = '';
  isSplitValid: boolean = true;
  showUnequalModal: boolean = false;
  private originalSplitsHash: string = '';

  private async hapticFeedback(style: ImpactStyle = ImpactStyle.Light) {
    try {
      await Haptics.impact({ style });
    } catch {
      // Gracefully ignore in browsers without haptics
    }
  }

  openUnequalModal() {
    this.hapticFeedback(ImpactStyle.Light);
    this.selectedSplitType = SplitType.Exact;
    const totalAmount = Number(this.expense?.amount?.toString().replace(/,/g, '')) || 0;
    const selected = this.roomMembers.filter(m => m.isSelected);
    const currentSum = selected.reduce((sum, m) => sum + (Number(m.value) || 0), 0);
    if (currentSum === 0 || Math.abs(currentSum - totalAmount) > 0.01) {
      this.setDefaultSplitValues();
    }
    this.recalculateSplits();
    this.showUnequalModal = true;
  }

  closeUnequalModal() {
    this.hapticFeedback(ImpactStyle.Light);
    this.showUnequalModal = false;
  }


  get selectedMembersCount(): number {
    return this.roomMembers.filter(m => m.isSelected).length;
  }

  getPerPersonAmount(): number {
    const total = Number(this.expense?.amount?.toString().replace(/,/g, '')) || 0;
    const count = this.selectedMembersCount;
    return count > 0 ? total / count : 0;
  }

  constructor(
    private modalCtrl: ModalController,
    private toast: Toastservice,
    private expenseService: ExpenseService
  ) { }

  ngOnInit() {
    this.originalExpense = JSON.parse(JSON.stringify(this.expense));
    this.filteredGroups = [...this.groups];
    this.roomName = this.filteredGroups[0]?.name || '';

    this.selectedSplitType = (this.expense.splitType !== undefined && this.expense.splitType !== null)
      ? this.expense.splitType
      : SplitType.Equal;

    this.loadRoomMembers();
  }

  loadRoomMembers() {
    if (!this.expense.roomId) return;

    this.loadingMembers = true;
    this.expenseService.getExpenses(this.expense.roomId).pipe(take(1)).subscribe({
      next: (res: any) => {
        this.loadingMembers = false;
        if (res?.success && res?.data?.membersSummary) {
          const existingSplits = this.expense.splits || [];
          this.roomMembers = res.data.membersSummary.map((m: any) => {
            const match = existingSplits.find((s: any) => s.memberId === m.memberId);
            let val = 0;
            if (match) {
              if (this.selectedSplitType === SplitType.Exact) val = match.owedAmount;
              else if (this.selectedSplitType === SplitType.Percentage) val = match.percentage ?? Math.round((match.owedAmount / (this.expense.amount || 1)) * 100);
              else if (this.selectedSplitType === SplitType.Shares) val = match.shares ?? 1;
              else val = match.owedAmount;
            }
            return {
              memberId: m.memberId,
              name: m.memberName,
              joinedDate: m.joinedDate,
              leftDate: m.leftDate,
              isSelected: existingSplits.length === 0 ? true : !!match,
              value: val,
              computedAmount: match ? match.owedAmount : 0
            };
          });

          this.syncMembersWithExpenseDate();
          if (existingSplits.length === 0) {
            this.setDefaultSplitValues();
          }
          this.recalculateSplits();
          this.originalSplitsHash = JSON.stringify(this.getSplitsPayload());
        }
      },
      error: () => {
        this.loadingMembers = false;
      }
    });
  }

  isMemberEligible(member: RoomMemberSplit): boolean {
    const expenseDateStr = this.expense?.originalDate || this.expense?.date;
    if (!expenseDateStr) return true;
    const expDate = new Date(expenseDateStr);
    expDate.setHours(23, 59, 59, 999);

    if (member.joinedDate) {
      const joinDate = new Date(member.joinedDate);
      if (joinDate > expDate) return false;
    }

    if (member.leftDate) {
      const leftDate = new Date(member.leftDate);
      leftDate.setHours(0, 0, 0, 0);
      const expDateStart = new Date(expenseDateStr);
      expDateStart.setHours(0, 0, 0, 0);
      if (leftDate < expDateStart) return false;
    }

    return true;
  }

  getMemberStatusReason(member: RoomMemberSplit): string {
    if (!this.isMemberEligible(member)) {
      const expenseDateStr = this.expense?.originalDate || this.expense?.date;
      if (member.leftDate && expenseDateStr) {
        const leftDate = new Date(member.leftDate);
        const expDate = new Date(expenseDateStr);
        leftDate.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);
        if (leftDate < expDate) return 'Left Room';
      }
      return 'Joined Later';
    }
    return 'Excluded';
  }

  syncMembersWithExpenseDate() {
    this.roomMembers.forEach(m => {
      if (!this.isMemberEligible(m)) {
        m.isSelected = false;
        m.value = 0;
        m.computedAmount = 0;
      }
    });

    this.setDefaultSplitValues();
    this.recalculateSplits();
  }

  setSplitType(type: SplitType) {
    this.hapticFeedback(ImpactStyle.Light);
    this.selectedSplitType = type;
    this.setDefaultSplitValues();
    this.recalculateSplits();
  }

  toggleMemberSelection(member: RoomMemberSplit) {
    if (!this.isMemberEligible(member)) {
      const reason = this.getMemberStatusReason(member);
      this.toast.error(`${member.name} was not in the room on this date (${reason})`);
      return;
    }
    this.hapticFeedback(ImpactStyle.Light);
    member.isSelected = !member.isSelected;
    if (!member.isSelected) {
      member.value = 0;
      member.computedAmount = 0;
    }
    this.setDefaultSplitValues();
    this.recalculateSplits();
  }



  onSplitValueChange() {
    this.recalculateSplits();
  }

  adjustShare(member: RoomMemberSplit, delta: number) {
    const current = Math.max(0, Math.floor(Number(member.value) || 0));
    member.value = Math.max(0, current + delta);
    this.recalculateSplits();
  }

  autoFillRemaining() {
    const totalAmount = Number(this.expense?.amount?.toString().replace(/,/g, '')) || 0;
    const selected = this.roomMembers.filter(m => m.isSelected);
    if (selected.length === 0) return;

    if (this.selectedSplitType === SplitType.Exact) {
      const allocatedOthers = selected.slice(0, selected.length - 1).reduce((sum, m) => sum + (Number(m.value) || 0), 0);
      const rem = Math.max(0, Math.round((totalAmount - allocatedOthers) * 100) / 100);
      selected[selected.length - 1].value = rem;
      selected[selected.length - 1].computedAmount = rem;
    } else if (this.selectedSplitType === SplitType.Percentage) {
      const allocatedOthers = selected.slice(0, selected.length - 1).reduce((sum, m) => sum + (Number(m.value) || 0), 0);
      const rem = Math.max(0, Math.round((100 - allocatedOthers) * 100) / 100);
      selected[selected.length - 1].value = rem;
      selected[selected.length - 1].computedAmount = Math.round(((totalAmount * rem) / 100) * 100) / 100;
    }
    this.recalculateSplits();
  }

  setDefaultSplitValues() {
    const totalAmount = Number(this.expense?.amount?.toString().replace(/,/g, '')) || 0;
    const selected = this.roomMembers.filter(m => m.isSelected);
    const count = selected.length;

    if (count === 0) return;

    if (this.selectedSplitType === SplitType.Exact || this.selectedSplitType === SplitType.Equal) {
      const baseVal = Math.floor((totalAmount / count) * 100) / 100;
      let remainder = Math.round((totalAmount - (baseVal * count)) * 100) / 100;
      selected.forEach((m, idx) => {
        m.value = Math.round((baseVal + (idx === 0 ? remainder : 0)) * 100) / 100;
        m.computedAmount = m.value;
      });
    } else if (this.selectedSplitType === SplitType.Percentage) {
      const basePct = Math.floor((100 / count) * 100) / 100;
      let remainder = Math.round((100 - (basePct * count)) * 100) / 100;
      selected.forEach((m, idx) => {
        m.value = Math.round((basePct + (idx === 0 ? remainder : 0)) * 100) / 100;
        m.computedAmount = Math.round(((totalAmount * m.value) / 100) * 100) / 100;
      });
    } else if (this.selectedSplitType === SplitType.Shares) {
      selected.forEach(m => {
        m.value = m.value && m.value > 0 ? m.value : 1;
      });
    }
  }

  recalculateSplits() {
    const totalAmount = Number(this.expense.amount) || 0;
    const selectedMembers = this.roomMembers.filter(m => m.isSelected);

    if (this.roomMembers.length === 0) {
      this.isSplitValid = true;
      this.splitStatusMessage = '';
      this.checkForChanges();
      return;
    }

    if (selectedMembers.length === 0) {
      this.isSplitValid = false;
      this.splitStatusMessage = 'Select at least 1 member to split';
      this.checkForChanges();
      return;
    }

    if (this.selectedSplitType === SplitType.Equal) {
      const baseShare = Math.floor((totalAmount / selectedMembers.length) * 100) / 100;
      let remainder = Math.round((totalAmount - (baseShare * selectedMembers.length)) * 100) / 100;
      selectedMembers.forEach((m, idx) => {
        m.computedAmount = Math.round((baseShare + (idx === 0 ? remainder : 0)) * 100) / 100;
      });
      this.isSplitValid = true;
      this.splitStatusMessage = `Split equally (₹${(totalAmount / selectedMembers.length).toFixed(2)}/person)`;
    }
    else if (this.selectedSplitType === SplitType.Exact) {
      const allocatedSum = selectedMembers.reduce((sum, m) => sum + (Number(m.value) || 0), 0);
      selectedMembers.forEach(m => {
        m.computedAmount = Math.round((Number(m.value) || 0) * 100) / 100;
      });
      const diff = Math.round((totalAmount - allocatedSum) * 100) / 100;
      if (diff === 0 && totalAmount > 0) {
        this.isSplitValid = true;
        this.splitStatusMessage = `✓ ₹${totalAmount.toFixed(2)} fully allocated`;
      } else if (diff > 0) {
        this.isSplitValid = false;
        this.splitStatusMessage = `₹${diff.toFixed(2)} remaining to allocate`;
      } else {
        this.isSplitValid = false;
        this.splitStatusMessage = `₹${Math.abs(diff).toFixed(2)} over total amount`;
      }
    }
    else if (this.selectedSplitType === SplitType.Percentage) {
      const totalPct = selectedMembers.reduce((sum, m) => sum + (Number(m.value) || 0), 0);
      selectedMembers.forEach(m => {
        const pct = Number(m.value) || 0;
        m.computedAmount = Math.round(((totalAmount * pct) / 100) * 100) / 100;
      });
      const diffPct = Math.round((100 - totalPct) * 100) / 100;
      if (diffPct === 0) {
        this.isSplitValid = true;
        this.splitStatusMessage = `✓ 100% fully assigned`;
      } else if (diffPct > 0) {
        this.isSplitValid = false;
        this.splitStatusMessage = `${diffPct.toFixed(1)}% remaining to assign`;
      } else {
        this.isSplitValid = false;
        this.splitStatusMessage = `${Math.abs(diffPct).toFixed(1)}% over 100%`;
      }
    }
    else if (this.selectedSplitType === SplitType.Shares) {
      const totalShares = selectedMembers.reduce((sum, m) => sum + Math.max(0, Math.floor(Number(m.value) || 0)), 0);
      if (totalShares <= 0) {
        this.isSplitValid = false;
        this.splitStatusMessage = 'Total shares must be at least 1';
      } else {
        let allocatedTotal = 0;
        selectedMembers.forEach((m, idx) => {
          const memberShares = Math.max(0, Math.floor(Number(m.value) || 0));
          const rawShare = (totalAmount * memberShares) / totalShares;
          const roundedShare = Math.floor(rawShare * 100) / 100;
          m.computedAmount = roundedShare;
          allocatedTotal += roundedShare;
        });
        let remainder = Math.round((totalAmount - allocatedTotal) * 100) / 100;
        if (remainder > 0 && selectedMembers.length > 0) {
          selectedMembers[0].computedAmount = Math.round((selectedMembers[0].computedAmount + remainder) * 100) / 100;
        }
        const shareVal = (totalAmount / totalShares).toFixed(2);
        this.isSplitValid = true;
        this.splitStatusMessage = `Total ${totalShares} share${totalShares > 1 ? 's' : ''} (1 share = ₹${shareVal})`;
      }
    }

    this.checkForChanges();
  }



  getSplitsPayload(): ExpenseSplit[] {
    const selectedMembers = this.roomMembers.filter(m => m.isSelected);
    return selectedMembers.map(m => ({
      memberId: m.memberId,
      owedAmount: Math.round(m.computedAmount * 100) / 100,
      percentage: this.selectedSplitType === SplitType.Percentage ? Number(m.value) : undefined,
      shares: this.selectedSplitType === SplitType.Shares ? Number(m.value) : undefined
    }));
  }

  // --- UI Helpers ---

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  filterRooms(event: any) {
    const searchTerm = event.target.value?.toLowerCase() || '';
    this.filteredGroups = this.groups.filter(g =>
      g.name.toLowerCase().includes(searchTerm)
    );
  }

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  toggleDatePicker() {
    this.showDatePicker = !this.showDatePicker;
  }

  onDateChange() {
    this.showDatePicker = false;
    this.syncMembersWithExpenseDate();
    this.checkForChanges();
  }

  // --- Change Tracking ---

  checkForChanges() {
    const splitsHash = JSON.stringify(this.getSplitsPayload());
    const splitsChanged = splitsHash !== this.originalSplitsHash;

    this.hasChanges =
      (this.expense.item !== this.originalExpense.item ||
      Number(this.expense.amount) !== Number(this.originalExpense.amount) ||
      this.expense.roomId !== this.originalExpense.roomId ||
      this.expense.originalDate !== this.originalExpense.originalDate ||
      this.selectedSplitType !== (this.originalExpense.splitType ?? SplitType.Equal) ||
      splitsChanged) &&
      this.isSplitValid;
  }

  onInputChange() {
    this.setDefaultSplitValues();
    this.recalculateSplits();
  }

  // --- API Action ---

  async saveExpense() {
    this.hapticFeedback(ImpactStyle.Medium);
    if (!this.hasChanges || !this.isSplitValid) {
      if (!this.isSplitValid) {
        this.toast.error(this.splitStatusMessage || 'Please fix split inputs before saving');
      } else {
        this.dismiss();
      }
      return;
    }

    const amount = Number(this.expense.amount);

    if (!this.expense.item?.trim()) {
      this.toast.error('Please enter the expense item');
      return;
    }

    if (isNaN(amount) || amount <= 1) {
      this.toast.error('Amount must be greater than 1.00');
      return;
    }

    if (!this.expense.roomId) {
      this.toast.error('Please select a room');
      return;
    }

    const apiExpense: ApiExpense = {
      expenseId: this.expense.expenseId,
      roomId: this.expense.roomId,
      memberId: this.expense.payerId,
      item: this.expense.item.trim(),
      amount: amount,
      date: this.expense.originalDate,
      splitType: this.selectedSplitType,
      splits: this.getSplitsPayload()
    };

    this.isSubmitting = true;

    this.expenseService.updateExpense(apiExpense)
      .pipe(
        take(1),
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (res) => {
          this.toast.success(res.message || 'Expense updated successfully');
          this.dismiss({ refresh: true });
        },
        error: (err) => {
          this.toast.error(err.message || 'Update failed');
        }
      });
  }
}