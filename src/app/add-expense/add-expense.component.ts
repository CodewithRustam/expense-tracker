import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonInput, ModalController } from '@ionic/angular';
import { ExpenseService } from '../core/services/expense';
import { Group } from '../core/models/group.model';
import { ApiExpense, SplitType, ExpenseSplit } from '../core/models/Expense/ApiExpense';
import { Toastservice } from '../core/services/toastservice';
import { finalize, take } from 'rxjs/operators';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface RoomMemberSplit {
  memberId: number;
  name: string;
  isSelected: boolean;
  value: number; // exact amount, percentage %, or share count
  computedAmount: number;
}

@Component({
  selector: 'app-add-expense-modal',
  templateUrl: './add-expense-modal.component.html',
  standalone: false
})
export class AddExpenseModalComponent implements OnInit {
  @Input() groups: Group[] = [];

  // Expose SplitType enum to template
  SplitType = SplitType;

  // Constants
  readonly MAX_ITEM_LENGTH = 20;
  readonly MIN_ITEM_LENGTH = 3;
  readonly DEFAULT_ROOM_NAME = 'General';
  readonly MIN_AMOUNT = 1;

  newExpense = {
    item: '',
    amount: '',
    date: new Date().toISOString(),
    roomId: 0
  };

  filteredGroups: Group[] = [];
  showDatePicker = false;
  today = new Date().toISOString().split('T')[0];
  isSubmitting = false;
  itemError = '';
  amountError = '';

  itemValid = false;
  amountValid = false;

  isFormValid = false;

  // Split States
  selectedSplitType: SplitType = SplitType.Equal;
  roomMembers: RoomMemberSplit[] = [];
  loadingMembers = false;
  splitStatusMessage = '';
  isSplitValid = true;
  showUnequalModal = false;

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
    const totalAmount = Number(this.newExpense.amount?.toString().replace(/,/g, '')) || 0;
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
    const total = Number(this.newExpense.amount?.toString().replace(/,/g, '')) || 0;
    const count = this.selectedMembersCount;
    return count > 0 ? total / count : 0;
  }

  @ViewChild('amountInput', { static: false }) amountInput!: IonInput;

  constructor(
    private modalCtrl: ModalController,
    private expenseService: ExpenseService,
    private toast: Toastservice
  ) { }

  ngOnInit() {
    this.initializeRooms();
    this.validateForm();
  }

  isRoomDisabled(roomId: number): boolean {
    if (roomId === 1) return true;
    const g = this.groups.find(group => group.roomId === roomId);
    return g?.status?.toLowerCase() === 'disabled';
  }

  private initializeRooms() {
    this.filteredGroups = [...this.groups];
    const activeRooms = this.groups.filter(g => !this.isRoomDisabled(g.roomId));
    if (activeRooms.length > 0) {
      const defaultRoom = activeRooms.find(
        g => g.name.toLowerCase() === this.DEFAULT_ROOM_NAME.toLowerCase()
      );
      const targetRoomId = defaultRoom ? defaultRoom.roomId : activeRooms[0].roomId;
      this.newExpense.roomId = targetRoomId;
      this.loadRoomMembers(targetRoomId);
    } else {
      this.newExpense.roomId = 0;
    }
  }

  selectRoom(g: Group) {
    if (this.isRoomDisabled(g.roomId)) return;
    this.hapticFeedback(ImpactStyle.Light);
    this.newExpense.roomId = g.roomId;
    this.loadRoomMembers(g.roomId);
    this.validateForm();
  }

  loadRoomMembers(roomId: number) {
    if (!roomId) {
      this.roomMembers = [];
      this.recalculateSplits();
      return;
    }

    this.loadingMembers = true;
    this.expenseService.getExpenses(roomId).pipe(take(1)).subscribe({
      next: (res: any) => {
        this.loadingMembers = false;
        if (res?.success && res?.data?.membersSummary) {
          this.roomMembers = res.data.membersSummary.map((m: any) => ({
            memberId: m.memberId,
            name: m.memberName,
            isSelected: true,
            value: 0,
            computedAmount: 0
          }));
          this.setDefaultSplitValues();
          this.recalculateSplits();
        } else {
          this.roomMembers = [];
          this.recalculateSplits();
        }
      },
      error: () => {
        this.loadingMembers = false;
        this.roomMembers = [];
        this.recalculateSplits();
      }
    });
  }

  setSplitType(type: SplitType) {
    this.hapticFeedback(ImpactStyle.Light);
    this.selectedSplitType = type;
    this.setDefaultSplitValues();
    this.recalculateSplits();
  }

  toggleMemberSelection(member: RoomMemberSplit) {
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
    const totalAmount = Number(this.newExpense.amount?.toString().replace(/,/g, '')) || 0;
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
    const totalAmount = Number(this.newExpense.amount?.toString().replace(/,/g, '')) || 0;
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
    const totalAmount = Number(this.newExpense.amount.toString().replace(/,/g, '')) || 0;
    const selectedMembers = this.roomMembers.filter(m => m.isSelected);

    if (this.roomMembers.length === 0) {
      this.isSplitValid = true;
      this.splitStatusMessage = '';
      this.validateForm();
      return;
    }

    if (selectedMembers.length === 0) {
      this.isSplitValid = false;
      this.splitStatusMessage = 'Select at least 1 member to split';
      this.validateForm();
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

    this.validateForm();
  }



  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  async addExpense() {
    this.hapticFeedback(ImpactStyle.Medium);

    if (this.isSubmitting) return;

    const amountVal = Number(
      this.newExpense.amount?.toString().replace(/,/g, '')
    ) || 0;

    if (!amountVal || amountVal < this.MIN_AMOUNT) {
      this.toast.error(`Please enter an amount greater than ₹${this.MIN_AMOUNT}`);
      return;
    }

    const itemVal = (this.newExpense.item || '').trim();
    if (!itemVal) {
      this.toast.error('Please enter what this expense was for');
      return;
    }
    if (itemVal.length < this.MIN_ITEM_LENGTH) {
      this.toast.error(`Item description must be at least ${this.MIN_ITEM_LENGTH} characters`);
      return;
    }

    if (!this.newExpense.roomId) {
      this.toast.error('Please select a group for this expense');
      return;
    }

    if (this.isRoomDisabled(this.newExpense.roomId)) {
      this.toast.error('This room is currently disabled.');
      return;
    }

    if (!this.isSplitValid) {
      this.toast.error(this.splitStatusMessage || 'Please check split allocations');
      return;
    }

    this.isSubmitting = true;

    const selectedMembers = this.roomMembers.filter(m => m.isSelected);
    const splitsPayload: ExpenseSplit[] = selectedMembers.map(m => ({
      memberId: m.memberId,
      owedAmount: Math.round(m.computedAmount * 100) / 100
    }));

    const payload: ApiExpense = {
      item: itemVal,
      amount: amountVal,
      date: this.newExpense.date,
      roomId: this.newExpense.roomId,
      memberId: 0,
      splitType: this.selectedSplitType,
      splits: splitsPayload
    };

    console.log('Sending Add Expense payload:', payload);

    this.expenseService.addExpense(payload)
      .pipe(
        take(1),
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (res) => {
          this.toast.success('Expense added successfully.');
          this.dismiss(res);
        },
        error: (err) => {
          this.toast.error(err.message || 'Failed to add expense');
        }
      });
  }

  // --- UI Helpers ---

  filterRooms(event: any) {
    const val = (event.target.value || '').toLowerCase();
    this.filteredGroups = this.groups.filter(g =>
      g.name.toLowerCase().includes(val)
    );
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  confirmDate() {
    setTimeout(() => { this.showDatePicker = false; }, 150);
  }

  onItemInput(event: any) {
    const raw = event.target.value || '';
    this.newExpense.item = raw;

    const trimmed = raw.trim();
    if (!trimmed) {
      this.itemError = 'Item name is required';
      this.itemValid = false;
    } else if (trimmed.length < this.MIN_ITEM_LENGTH) {
      this.itemError = `Minimum ${this.MIN_ITEM_LENGTH} characters required`;
      this.itemValid = false;
    } else if (trimmed.length > this.MAX_ITEM_LENGTH) {
      this.itemError = `Maximum ${this.MAX_ITEM_LENGTH} characters allowed`;
      this.itemValid = false;
    } else {
      this.itemError = '';
      this.itemValid = true;
    }

    this.validateForm();
  }

  onAmountInput(event: any) {
    const raw = event.target.value || '';
    const numericOnly = raw.replace(/[^0-9.]/g, '');

    event.target.value = numericOnly;
    this.newExpense.amount = numericOnly;

    const amount = Number(numericOnly);

    if (!numericOnly || isNaN(amount)) {
      this.amountError = 'Amount is required';
      this.amountValid = false;
    } else if (amount < this.MIN_AMOUNT) {
      this.amountError = `Enter amount greater than ₹${this.MIN_AMOUNT}`;
      this.amountValid = false;
    } else {
      this.amountError = '';
      this.amountValid = true;
    }

    this.setDefaultSplitValues();
    this.recalculateSplits();
  }

  onAmountBlur() {
    const value = Number(this.newExpense.amount?.toString().replace(/,/g, ''));
    if (this.amountValid && value > 0) {
      this.newExpense.amount = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    this.setDefaultSplitValues();
    this.recalculateSplits();
  }

  private validateForm() {
    this.isFormValid =
      this.itemValid &&
      this.amountValid &&
      !!this.newExpense.roomId &&
      !this.isRoomDisabled(this.newExpense.roomId) &&
      this.isSplitValid;
  }

  private looksRandom(word: string): boolean {
    const lower = word.toLowerCase();
    const vowels = lower.match(/[aeiou]/g)?.length || 0;
    const consonants = lower.match(/[bcdfghjklmnpqrstvwxyz]/g)?.length || 0;
    const consonantCluster = /[^aeiou\s,]{5,}/.test(lower);
    const consonantRatio = consonants / (vowels + consonants || 1);
    const switchCount = (lower.match(/([a-z])(?=[^a-z]*\1)/g)?.length || 0);

    const rules = [
      vowels === 0,
      consonantCluster,
      consonantRatio > 0.8,
      switchCount > lower.length / 2
    ];

    return rules.some(r => r);
  }
}