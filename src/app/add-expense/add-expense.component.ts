import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonInput, ModalController } from '@ionic/angular';
import { ExpenseService } from '../services/expense';
import { Group } from '../models/group.model';
import { ApiExpense } from '../models/Expense/ApiExpense';
import { Toastservice } from '../services/toastservice';
import { finalize, take } from 'rxjs/operators';

@Component({
  selector: 'app-add-expense-modal',
  templateUrl: './add-expense-modal.component.html',
  standalone: false
})
export class AddExpenseModalComponent implements OnInit {
  @Input() groups: Group[] = [];

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

  private itemDebounce: any;
  private amountDebounce: any;

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

  async addExpense() {

    if (!this.isFormValid || this.isSubmitting) return;

    this.isSubmitting = true;

    const amountVal = Number(
      this.newExpense.amount.toString().replace(/,/g, '')
    );

    const payload: ApiExpense = {
      item: this.newExpense.item.trim(),
      amount: amountVal,
      date: this.newExpense.date,
      roomId: this.newExpense.roomId,
      memberId: 0
    };

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

  onItemInput(event: any) {

    const raw = event.target.value || '';

    // Allow only letters, comma and space
    const cleaned = raw.replace(/[^a-zA-Z,\s]/g, '');

    // Auto capitalize first letter + after comma
    const formatted = cleaned
      .toLowerCase()
      .replace(/(^\s*\w|,\s*\w)/g, (c: string) => c.toUpperCase());

    // Update input without flicker
    event.target.value = formatted;
    this.newExpense.item = formatted;

    const trimmed = formatted.trim();

    const validations = [
      { check: !trimmed, msg: 'Item name is required' },
      { check: trimmed.length < this.MIN_ITEM_LENGTH, msg: `Minimum ${this.MIN_ITEM_LENGTH} characters required` },
      { check: trimmed.length > this.MAX_ITEM_LENGTH, msg: `Maximum ${this.MAX_ITEM_LENGTH} characters allowed` },
      { check: trimmed.split(',').some((w: string) => this.looksRandom(w.trim())), msg: 'Item name looks invalid' },
      { check: /(.)\1{4,}/.test(trimmed), msg: 'Invalid item name' }
    ];

    this.itemError = validations.find(v => v.check)?.msg || '';
    this.itemValid = !this.itemError;

    this.validateForm();
  }

  onAmountInput(event: any) {

    const raw = event.target.value || '';

    // Allow only digits
    const numericOnly = raw.replace(/[^0-9]/g, '');

    event.target.value = numericOnly;
    this.newExpense.amount = numericOnly;

    const amount = Number(numericOnly);

    const validations = [
      { check: !numericOnly, msg: 'Amount is required' },
      { check: amount <= this.MIN_AMOUNT, msg: `Enter amount greater than ₹${this.MIN_AMOUNT}` }
    ];

    this.amountError = validations.find(v => v.check)?.msg || '';
    this.amountValid = !this.amountError;

    this.validateForm();
  }

  onAmountBlur() {

    const value = Number(this.newExpense.amount);

    this.amountValid &&
      (this.newExpense.amount = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value));
  }

  private validateForm() {
    this.isFormValid =
      this.itemValid &&
      this.amountValid &&
      !!this.newExpense.roomId;
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