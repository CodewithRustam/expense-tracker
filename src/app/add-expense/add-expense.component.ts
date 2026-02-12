import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AddExpenseResponse, ExpenseService } from '../services/expense';
import { Group } from '../models/group.model';
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
  @Input() users: { id: number, name: string }[] = [];

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
  isSubmitting = false; // Prevents double clicks

  constructor(
    private modalCtrl: ModalController,
    private expenseService: ExpenseService,
    private toast: Toastservice
  ) { }

  ngOnInit() {
    this.initializeRooms();
  }

  /**
   * Sets up room list and selects default room
   */
  private initializeRooms() {
    this.filteredGroups = [...this.groups];

    if (this.groups.length > 0) {
      const defaultRoom = this.groups.find(
        g => g.name.toLowerCase() === this.DEFAULT_ROOM_NAME.toLowerCase()
      );
      // Select 'General' if exists, otherwise first room
      this.newExpense.roomId = defaultRoom ? defaultRoom.roomId : this.groups[0].roomId;
    }
  }

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  filterRooms(event: any) {
    const val = (event.target.value || '').toLowerCase();
    this.filteredGroups = this.groups.filter(g =>
      g.name.toLowerCase().includes(val)
    );
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /**
   * Main submission logic
   */
  async addExpense() {
    // 1. Sanitize Data
    const sanitizedItem = this.newExpense.item.trim();
    const amountVal = parseFloat(this.newExpense.amount);

    // 2. Validate
    if (!this.validateInput(sanitizedItem, amountVal)) {
      return;
    }

    // 3. Prepare Payload (update model with sanitized strings)
    this.newExpense.item = sanitizedItem;
    const payload = { ...this.newExpense, amount: amountVal.toString() };

    this.isSubmitting = true;

    // 4. API Call
    this.expenseService.addExpense(payload)
      .pipe(
        take(1), // Ensure observable completes
        finalize(() => this.isSubmitting = false) // Reset loading state
      )
      .subscribe({
        next: (res: AddExpenseResponse) => {
          if (res.success) {
            this.toast.success('Expense added successfully.');
            this.dismiss(res);
          } else {
            this.toast.error(res.message || 'Could not add expense. Please try again.');
          }
        },
        error: (err: any) => {
          console.error('Expense Error:', err);
          const msg = err?.error?.message || 'Network error. Please check your connection.';
          this.toast.error(msg);
        }
      });
  }

  /**
   * Centralized validation rules
   */
  private validateInput(item: string, amount: number): boolean {
    // Basic Empty Checks
    if (!item || !this.newExpense.amount || !this.newExpense.roomId) {
      this.toast.error('Please complete all required fields.');
      return false;
    }

    // Item Length
    if (item.length < this.MIN_ITEM_LENGTH) {
      this.toast.error(`Item name is too short (min ${this.MIN_ITEM_LENGTH} chars).`);
      return false;
    }
    if (item.length > this.MAX_ITEM_LENGTH) {
      this.toast.error(`Item name is too long (max ${this.MAX_ITEM_LENGTH} chars).`);
      return false;
    }

    // Amount Validation
    if (isNaN(amount) || amount <= this.MIN_AMOUNT) {
      this.toast.error(`Please enter a valid amount greater than ₹${this.MIN_AMOUNT}.`);
      return false;
    }

    // Spam/Nonsense Filters
    const repeatingRegex = /(.)\1{4,}/; // e.g. "aaaaa"
    const noVowelsRegex = /^[^aeiouAEIOU]+$/; // e.g. "klmnj"

    if (repeatingRegex.test(item)) {
      this.toast.error('Please enter a valid item description.');
      return false;
    }

    // Allow acronyms only if short (e.g., "KFC" is okay, "BKJDFHG" is not)
    if (item.length > 5 && noVowelsRegex.test(item)) {
      this.toast.error('Item description appears invalid. Please check spelling.');
      return false;
    }

    return true;
  }
  confirmDate() {

    setTimeout(() => {

      this.showDatePicker = false;

    }, 150);

  }
} 