import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth-service';
import { ExpenseService } from '../services/expense';
import { Subscription } from 'rxjs';
import { UserExpenseResponse } from '../models/Expense/UserExpenseResponse';

interface Expense {
  name: string;
  room: string;
  total: number;
  date: Date;
  type: 'credit' | 'debit';
  iconName: string;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false
})
export class HistoryPage implements OnInit, OnDestroy {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  months: string[] = [];
  selectedMonth: string = '';
  currentMonthIndex: number = 0;
  filterType: 'all' | 'credit' | 'debit' = 'all';
  total: number = 0;
  isLoading: boolean = true;
  isLoadingExpenses: boolean = false;
  isSticky: boolean = false;

  private refreshSub!: Subscription;

  constructor(
    private expenseService: ExpenseService,
    private authService: AuthService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    if (this.authService.isTokenExpired()) {
      this.authService.clearTokenAndRedirect();
      return;
    }

    // Initial load
    this.loadExpenseMonths();

    // ✅ Listen for global changes (Add, Update, Delete, Settle)
    this.refreshSub = this.expenseService.refresh$.subscribe(() => {
      // Pass 'true' to indicate a background refresh
      this.loadExpenseMonths(true);
    });
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  // 🔹 Step 1: Get all months
  loadExpenseMonths(isBackground = false) {
    if (!isBackground) this.isLoading = true;

    this.expenseService.getExpenseMonths().subscribe({
      next: (response) => {
        if (response.success && response.data?.length) {
          this.months = response.data
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(month => {
              const [year, monthNum] = month.split('-');
              const monthName = new Date(Number(year), Number(monthNum) - 1).toLocaleString('default', { month: 'long' });
              return `${monthName} ${year}`;
            });

          // Maintain the current selection index if possible during refresh
          if (!isBackground || this.currentMonthIndex === 0) {
            this.currentMonthIndex = this.months.length - 1;
          }

          this.selectedMonth = this.months[this.currentMonthIndex];
          this.loadUserExpenses(this.formatApiMonth(this.selectedMonth), isBackground);
        } else {
          this.isLoading = false;
          this.presentToast('No history available', 'warning');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.presentToast('Error fetching months', 'danger');
      }
    });
  }

  // 🔹 Step 2: Load user expenses for a given month
  loadUserExpenses(month: string, isBackground = false) {
    if (!isBackground) this.isLoadingExpenses = true;

    this.expenseService.getUserExpenses(month).subscribe({
      next: (response) => {
        this.processExpenses(response);
        this.isLoadingExpenses = false;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoadingExpenses = false;
        this.isLoading = false;
        this.presentToast('Error fetching expenses', 'danger');
      }
    });
  }

  // 🔹 Step 3: Process API response
  processExpenses(data: { userExpenseResponse: UserExpenseResponse[] }) {
    if (!data.userExpenseResponse || data.userExpenseResponse.length === 0) {
      this.expenses = [];
      this.filteredExpenses = [];
      this.total = 0;
      return;
    }

    this.expenses = data.userExpenseResponse.map(exp => ({
      name: exp.item?.trim() || 'Unknown',
      room: exp.roomName?.trim() || 'Unknown',
      total: exp.amount ?? 0,
      date: new Date(exp.expenseDate),
      type: exp.amount >= 0 ? 'credit' : 'debit', // Logical mapping
      iconName: exp.iconName || 'fa-solid fa-receipt'
    }));

    this.filterExpenses(this.filterType);
  }

  filterExpenses(type: 'all' | 'credit' | 'debit') {
    this.filterType = type;
    let tempExpenses = [...this.expenses];

    if (type !== 'all') {
      tempExpenses = tempExpenses.filter(exp => exp.type === type);
    }

    this.filteredExpenses = tempExpenses.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate total based on current filtered view
    this.total = this.filteredExpenses.reduce(
      (sum, exp) => sum + exp.total,
      0
    );
  }

  // 🔹 Navigation Logic
  previousMonth() {
    if (this.currentMonthIndex > 0) {
      this.currentMonthIndex--;
      this.selectedMonth = this.months[this.currentMonthIndex];
      this.loadUserExpenses(this.formatApiMonth(this.selectedMonth));
    }
  }

  nextMonth() {
    if (this.currentMonthIndex < this.months.length - 1) {
      this.currentMonthIndex++;
      this.selectedMonth = this.months[this.currentMonthIndex];
      this.loadUserExpenses(this.formatApiMonth(this.selectedMonth));
    }
  }

  toggleFilter() {
    const types: ('all' | 'credit' | 'debit')[] = ['all', 'credit', 'debit'];
    const nextIndex = (types.indexOf(this.filterType) + 1) % types.length;
    this.filterExpenses(types[nextIndex]);
  }

  private formatApiMonth(displayMonth: string): string {
    const [monthName, year] = displayMonth.split(' ');
    const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    return `${year}-${monthNumber.toString().padStart(2, '0')}`;
  }

  // 🔹 UI Helpers
  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  onScroll(event: any) {
    this.isSticky = event.detail.scrollTop > 60;
  }

  getIconColor(iconName: string | undefined): string {
    const iconMap: { [key: string]: string } = {
      'fa-solid fa-leaf': '#27ae60',
      'fa-solid fa-drumstick-bite': '#e74c3c',
      'fa-solid fa-burn': '#f1c40f',
      'fa-solid fa-bread-slice': '#8e44ad',
      'fa-solid fa-mug-hot': '#3498db',
      'fa-solid fa-utensils': '#e67e22',
      'fa-solid fa-box-open': '#7f8c8d',
      'fa-solid fa-seedling': '#2ecc71',
      'fa-solid fa-receipt': '#666'
    };
    return iconMap[iconName || ''] || '#666';
  }
}