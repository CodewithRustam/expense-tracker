import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth-service';
import { ExpenseService, UserExpenseResponse } from '../services/expense';
import { Subscription } from 'rxjs';

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
export class HistoryPage {
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

    // Listen for changes from other parts of the app
    this.refreshSub = this.expenseService.refreshNeeded.subscribe(() => {
      this.loadExpenseMonths();
    });
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  // 🔹 Step 1: Get all months first
  loadExpenseMonths() {
    this.isLoading = true;
    this.expenseService.getExpenseMonths().subscribe({
      next: (response) => {
        if (response.success && response.data?.length) {
          this.months = response.data
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(month => {
              const [year] = month.split('-');
              const monthName = new Date(`${month}-01`).toLocaleString('default', { month: 'long' });
              return `${monthName} ${year}`;
            });

          this.currentMonthIndex = this.months.length - 1;
          this.selectedMonth = this.months[this.currentMonthIndex];

          // Load expenses for latest month
          this.loadUserExpenses(this.formatApiMonth(this.selectedMonth));
        } else {
          this.presentToast('No months available', 'warning');
        }
      },
      error: (err) => {
        this.presentToast('Error fetching months', 'danger');
        console.error('Error fetching months:', err);
      }
    });
  }

  // 🔹 Step 2: Load user expenses for a given month
  loadUserExpenses(month: string) {
    this.isLoadingExpenses = true;

    this.expenseService.getUserExpenses(this.formatApiMonth(this.selectedMonth)).subscribe({
      next: (response) => {
        if (response.userExpenseResponse?.length) {
          this.processExpenses(response);
        } else {
          this.presentToast('No expenses found for this month', 'warning');
        }
      },
      error: (err) => {
        this.presentToast('Error fetching expenses', 'danger');
        console.error('Error fetching expenses:', err);
      }
    });

  }

  // 🔹 Step 3: Convert API response to local Expense model
  processExpenses(data: { userExpenseResponse: UserExpenseResponse[] }) {
    if (!data.userExpenseResponse || data.userExpenseResponse.length === 0) {
      this.expenses = [];
      this.filteredExpenses = [];
      this.total = 0;
      this.presentToast('No expenses found for this month', 'warning');
      return;
    }
    this.expenses = data.userExpenseResponse.map(exp => ({
      name: exp.item?.trim() || 'Unknown',
      room: exp.roomName?.trim() || 'Unknown',
      total: exp.amount ?? 0,
      date: new Date(exp.expenseDate),
      type: exp.amount >= 0 ? 'credit' : 'debit',
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
    this.total = this.filteredExpenses.reduce(
      (sum, exp) => sum + (exp.type === 'credit' ? exp.total : -exp.total),
      0
    );
    this.isLoading = false;
    this.isLoadingExpenses = false;
  }

  toggleFilter() {
    const types: ('all' | 'credit' | 'debit')[] = ['all', 'credit', 'debit'];
    const currentIndex = types.indexOf(this.filterType);
    const nextIndex = (currentIndex + 1) % types.length;
    this.filterExpenses(types[nextIndex]);
  }

  // 🔹 Step 4: Month navigation triggers API call
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

  // 🔹 Converts "October 2025" → "2025-10" for API
  private formatApiMonth(displayMonth: string): string {
    const [monthName, year] = displayMonth.split(' ');
    const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    return `${year}-${monthNumber.toString().padStart(2, '0')}`;
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  getIconColor(iconName: string | undefined): string {
    if (!iconName) return '#666';
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
    return iconMap[iconName] || '#666';
  }
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    // Threshold: 60px (approx height of the 'History' header + padding)
    // When the user scrolls past the header, the dashboard becomes sticky
    this.isSticky = scrollTop > 60;
  }
}