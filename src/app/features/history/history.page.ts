import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth-service';
import { ExpenseService } from '../../core/services/expense';
import { Subscription } from 'rxjs';
import { UserExpenseResponse } from '../../core/models/Expense/UserExpenseResponse';

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
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryPage implements OnInit, OnDestroy {
  private expenseService = inject(ExpenseService);
  private authService = inject(AuthService);
  private toastController = inject(ToastController);

  months = signal<string[]>([]);
  expenses = signal<Expense[]>([]);
  
  selectedMonth = signal<string>('');
  currentMonthIndex = signal<number>(0);
  filterType = signal<'all' | 'credit' | 'debit'>('all');
  
  isLoading = signal<boolean>(true);
  isLoadingExpenses = signal<boolean>(false);
  isSticky = signal<boolean>(false);

  filteredExpenses = computed(() => {
    const type = this.filterType();
    let tempExpenses = [...this.expenses()];
    if (type !== 'all') {
      tempExpenses = tempExpenses.filter(exp => exp.type === type);
    }
    return tempExpenses.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  total = computed(() => {
    return this.filteredExpenses().reduce((sum, exp) => sum + exp.total, 0);
  });

  private refreshSub!: Subscription;

  ngOnInit() {
    if (this.authService.isTokenExpired()) {
      this.authService.clearTokenAndRedirect();
      return;
    }

    this.loadExpenseMonths();

    this.refreshSub = this.expenseService.refresh$.subscribe(() => {
      this.loadExpenseMonths(true);
    });
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  loadExpenseMonths(isBackground = false) {
    if (!isBackground) this.isLoading.set(true);

    this.expenseService.getExpenseMonths().subscribe({
      next: (response) => {
        if (response.success && response.data?.length) {
          const formattedMonths = response.data
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(month => {
              const [year, monthNum] = month.split('-');
              const monthName = new Date(Number(year), Number(monthNum) - 1).toLocaleString('default', { month: 'long' });
              return `${monthName} ${year}`;
            });
            
          this.months.set(formattedMonths);

          if (!isBackground || this.currentMonthIndex() === 0) {
            this.currentMonthIndex.set(formattedMonths.length - 1);
          }

          this.selectedMonth.set(formattedMonths[this.currentMonthIndex()]);
          this.loadUserExpenses(this.formatApiMonth(this.selectedMonth()), isBackground);
        } else {
          this.isLoading.set(false);
          this.presentToast('No history available', 'warning');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.presentToast('Error fetching months', 'danger');
      }
    });
  }

  loadUserExpenses(month: string, isBackground = false) {
    if (!isBackground) this.isLoadingExpenses.set(true);

    this.expenseService.getUserExpenses(month).subscribe({
      next: (response) => {
        this.processExpenses(response);
        this.isLoadingExpenses.set(false);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoadingExpenses.set(false);
        this.isLoading.set(false);
        this.presentToast('Error fetching expenses', 'danger');
      }
    });
  }

  processExpenses(data: { userExpenseResponse: UserExpenseResponse[] }) {
    if (!data.userExpenseResponse || data.userExpenseResponse.length === 0) {
      this.expenses.set([]);
      return;
    }

    const mapped = data.userExpenseResponse.map(exp => ({
      name: exp.item?.trim() || 'Unknown',
      room: exp.roomName?.trim() || 'Unknown',
      total: exp.amount ?? 0,
      date: new Date(exp.expenseDate),
      type: exp.amount >= 0 ? 'debit' : 'credit' as 'credit' | 'debit',
      iconName: exp.iconName || 'fa-solid fa-receipt'
    }));
    
    this.expenses.set(mapped);
  }

  filterExpenses(type: 'all' | 'credit' | 'debit') {
    this.filterType.set(type);
  }

  previousMonth() {
    const currentIndex = this.currentMonthIndex();
    if (currentIndex > 0) {
      this.currentMonthIndex.set(currentIndex - 1);
      this.selectedMonth.set(this.months()[currentIndex - 1]);
      this.loadUserExpenses(this.formatApiMonth(this.selectedMonth()));
    }
  }

  nextMonth() {
    const currentIndex = this.currentMonthIndex();
    if (currentIndex < this.months().length - 1) {
      this.currentMonthIndex.set(currentIndex + 1);
      this.selectedMonth.set(this.months()[currentIndex + 1]);
      this.loadUserExpenses(this.formatApiMonth(this.selectedMonth()));
    }
  }

  toggleFilter() {
    const types: ('all' | 'credit' | 'debit')[] = ['all', 'credit', 'debit'];
    const nextIndex = (types.indexOf(this.filterType()) + 1) % types.length;
    this.filterExpenses(types[nextIndex]);
  }

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

  onScroll(event: any) {
    this.isSticky.set(event.detail.scrollTop > 60);
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