import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ExpenseService } from '../services/expense';
import { Group } from '../models/group.model';
import { ApiExpense } from '../models/Expense/ApiExpense';
import { Toastservice } from '../services/toastservice';
import { finalize, take } from 'rxjs/operators';

@Component({
  selector: 'app-add-expense-modal',
  templateUrl: './add-expense-modal.component.html',
  styleUrls: ['./add-expense-modal.component.scss'],
  standalone: false
})
export class AddExpenseModalComponent implements OnInit {
  @Input() groups: Group[] = [];

  // Constants
  readonly MAX_ITEM_LENGTH = 30;
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

  constructor(
    private modalCtrl: ModalController,
    private expenseService: ExpenseService,
    private toast: Toastservice
  ) { }

  ngOnInit() {
    this.initializeRooms();
  }

  private initializeRooms() {
    this.filteredGroups = [...this.groups];
    if (this.groups.length > 0) {
      const defaultRoom = this.groups.find(
        g => g.name.toLowerCase() === this.DEFAULT_ROOM_NAME.toLowerCase()
      );
      this.newExpense.roomId = defaultRoom ? defaultRoom.roomId : this.groups[0].roomId;
    }
  }

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  // --- Logic ---

  async addExpense() {
    const sanitizedItem = this.newExpense.item.trim();
    const amountVal = parseFloat(this.newExpense.amount);

    if (!this.validateInput(sanitizedItem, amountVal)) return;

    this.isSubmitting = true;

    // Prepare payload matching ApiExpense interface
    const payload: ApiExpense = {
      item: sanitizedItem,
      amount: amountVal,
      date: this.newExpense.date,
      roomId: this.newExpense.roomId,
      memberId: 0 // Backend usually identifies user via Token, but interface requires it
    };

    this.expenseService.addExpense(payload)
      .pipe(
        take(1),
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (res) => {
          // res.success check is already handled in service error handler 
          // but we check res.success here for specific business logic if needed
          this.toast.success('Expense added successfully.');
          this.dismiss(res);
          // ✅ Note: No need to call notifyDataChanged() here. 
          // The service does it automatically!
        },
        error: (err) => {
          // The service's handleError maps the error to a standard format
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

  // --- Validation ---

  private validateInput(item: string, amount: number): boolean {
    if (!item || !this.newExpense.amount || !this.newExpense.roomId) {
      this.toast.error('Please complete all required fields.');
      return false;
    }

    if (item.length < this.MIN_ITEM_LENGTH || item.length > this.MAX_ITEM_LENGTH) {
      this.toast.error(`Item name must be ${this.MIN_ITEM_LENGTH}-${this.MAX_ITEM_LENGTH} characters.`);
      return false;
    }

    if (isNaN(amount) || amount <= this.MIN_AMOUNT) {
      this.toast.error(`Enter an amount greater than ₹${this.MIN_AMOUNT}.`);
      return false;
    }

    // Anti-spam filters
    if (/(.)\1{4,}/.test(item)) {
      this.toast.error('Please enter a valid item description.');
      return false;
    }

    return true;
  }
}