import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ExpenseService } from 'src/app/services/expense';
import { Toastservice } from 'src/app/services/toastservice';
import { finalize, take } from 'rxjs/operators';
import { ApiExpense } from 'src/app/models/Expense/ApiExpense';


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
  isSubmitting: boolean = false; // Added to prevent double-tap
  filteredGroups: { roomId: number; name: string }[] = [];
  roomName: string = '';

  constructor(
    private modalCtrl: ModalController,
    private toast: Toastservice,
    private expenseService: ExpenseService
  ) { }

  ngOnInit() {
    // Create a deep copy to track changes
    this.originalExpense = JSON.parse(JSON.stringify(this.expense));
    this.filteredGroups = [...this.groups];
    this.roomName = this.filteredGroups[0].name;
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
    this.checkForChanges();
  }

  // --- Change Tracking ---

  checkForChanges() {
    this.hasChanges =
      this.expense.item !== this.originalExpense.item ||
      Number(this.expense.amount) !== Number(this.originalExpense.amount) ||
      this.expense.roomId !== this.originalExpense.roomId ||
      this.expense.originalDate !== this.originalExpense.originalDate;
  }

  onInputChange() {
    this.checkForChanges();
  }

  // --- API Action ---

  async saveExpense() {
    if (!this.hasChanges) {
      this.dismiss();
      return;
    }

    const amount = Number(this.expense.amount);

    // Validation
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
      date: this.expense.originalDate
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
          // ✅ Close modal. The service's tap() has already triggered the 
          // global refresh$ stream, so all background pages will auto-reload.
          this.dismiss({ refresh: true });
        },
        error: (err) => {
          // The service handleError provides the formatted error message
          this.toast.error(err.message || 'Update failed');
        }
      });
  }
}