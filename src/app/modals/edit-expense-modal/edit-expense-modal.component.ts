import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AddExpenseResponse, ApiExpense, ExpenseService } from 'src/app/services/expense';
import { Toastservice } from 'src/app/services/toastservice';

interface Expense {
  expenseId: number; // Added to match parent component
  item: string;
  amount: number;
  roomId: number | null;
  originalDate: string; // Fixed typo from OrigninalDate
  date: string; // Added to match parent component
  payerId: number; // Added to match parent component
  payerName: string; // Added to match parent component
  category: string; // Added to match parent component
  iconName: string; // Added to match parent component
  isEditShow: boolean; // Added to match parent component
}

@Component({
  selector: 'app-edit-expense-modal',
  templateUrl: './edit-expense-modal.component.html',
  styleUrls: ['./edit-expense-modal.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None

})
export class EditExpenseModal implements OnInit {
  @Input() expense!: Expense;
  @Input() groups: { roomId: number; name: string }[] = [];

  showDatePicker: boolean = false;
  today: string = new Date().toISOString().split('T')[0];
  originalExpense!: Expense;
  hasChanges: boolean = false;
  filteredGroups: { roomId: number; name: string }[] = [];

  constructor(private modalCtrl: ModalController, private toast: Toastservice, private expenseService: ExpenseService) { }

  ngOnInit() {
    this.originalExpense = { ...this.expense };
    this.filteredGroups = [...this.groups];
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  filterRooms(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (!searchTerm) {
      this.filteredGroups = [...this.groups];
    } else {
      this.filteredGroups = this.groups.filter(g => 
        g.name.toLowerCase().includes(searchTerm)
      );
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  toggleDatePicker() {
    this.showDatePicker = !this.showDatePicker;
  }

  onDateChange() {
    this.showDatePicker = false;
    this.checkForChanges();
  }

  // Check if any field has changed
  checkForChanges() {
    this.hasChanges =
      this.expense.item !== this.originalExpense.item ||
      this.expense.amount !== this.originalExpense.amount ||
      this.expense.roomId !== this.originalExpense.roomId ||
      this.expense.originalDate !== this.originalExpense.originalDate;
  }

  onInputChange() {
    this.checkForChanges();
  }

  async saveExpense() {
    if (!this.hasChanges) {
      this.modalCtrl.dismiss();
      return;
    }

    const amount = Number(this.expense.amount);

    if (!this.expense.item?.trim()) {
      await this.toast.error('Please enter the expense item');
      return;
    }

    if (!this.expense.amount || isNaN(amount) || amount <= 1) {
      await this.toast.error('Amount must be greater than 1.00');
      return;
    }

    if (!this.expense.roomId) {
      await this.toast.error('Please select a room');
      return;
    }

    const apiExpense: ApiExpense = {
      expenseId: this.expense.expenseId,
      roomId: this.expense.roomId,
      memberId: this.expense.payerId,
      item: this.expense.item,
      amount: amount,
      date: this.expense.originalDate
    };

    this.expenseService.updateExpense({ ...apiExpense }).subscribe({
      next: async (res: AddExpenseResponse) => {
        if (res.success) {
          this.toast.success(res.message);
        }
        else {
          this.toast.error(res.message);
        }
        this.modalCtrl.dismiss({
          refresh: true,
          updatedExpense: apiExpense
        });
      },
      error: async (err: AddExpenseResponse) => {
        this.toast.error('Expense update failed. Please try again.');
      }
    });
  }
}