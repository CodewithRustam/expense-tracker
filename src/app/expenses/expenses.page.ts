import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExpenseService } from '../core/services/expense';
import { IonItemSliding, ModalController } from '@ionic/angular';
import { AuthService } from '../core/services/auth-service';
import { EditExpenseModal } from '../shared/modals/edit-expense-modal/edit-expense-modal.component';
import { SettleExpenseModalComponent, SettlementResponse } from '../shared/modals/settle-expense-modal/settle-expense-modal.component';
import { Toastservice } from '../core/services/toastservice';
import { GlobalModalComponent } from '../shared/modals/global-modal/global-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GroupService } from '../core/services/group';
import { Subscription, distinctUntilChanged, map } from 'rxjs';
import { SettlementDetail } from '../core/models/Settlement/SettlementDetail';
import { AddMemberModalComponent } from '../shared/modals/add-member-modal/add-member-modal.component';

interface Expense {
  expenseId: number;
  roomId: number;
  item: string;
  amount: number;
  date: string;
  payerId: number;
  payerName: string;
  category: string;
  iconName: string;
  isEditShow: boolean;
  originalDate: string;
}

interface ExpenseDateGroup {
  date: string;
  expenses: any[];
}

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesPage implements OnInit, OnDestroy {
  // Services
  private expenseService = inject(ExpenseService);
  private route = inject(ActivatedRoute);
  private toast = inject(Toastservice);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private groupService = inject(GroupService);

  // Signal State
  months = signal<string[]>([]);
  users = signal<any[]>([]);
  selectedMonth = signal<string>('');
  selectedUser = signal<number | undefined>(undefined);
  roomId = signal<number | undefined>(undefined);
  roomName = signal<string>('');
  isLoading = signal<boolean>(true);
  isLoadingExpenses = signal<boolean>(false);
  groups = signal<{ roomId: number | undefined; name: string }[]>([]);
  expenses = signal<Expense[]>([]);
  currentUserId = signal<number | undefined>(undefined);
  groupedExpensesMap = signal<{ [userId: number]: ExpenseDateGroup[] }>({});

  settlementDataByUser = signal<{ [memberId: number]: SettlementDetail[] }>({});
  settlementLoadingByUser = signal<{ [memberId: number]: boolean }>({});

  // Computed Values
  isNextMonthDisabled = computed(() => {
    const currentIndex = this.months().indexOf(this.selectedMonth());
    return currentIndex === 0 || this.months().length === 0;
  });

  isPrevMonthDisabled = computed(() => {
    const currentIndex = this.months().indexOf(this.selectedMonth());
    return currentIndex === this.months().length - 1 || this.months().length === 0;
  });

  totalAllTime = computed(() => {
    return this.users().reduce((sum, user) => sum + (user.totalMemberExpense || 0), 0);
  });

  averageAmount = computed(() => {
    const usersList = this.users();
    return usersList.length ? this.totalAllTime() / usersList.length : 0;
  });

  hasExpensesInSelectedMonth = computed(() => {
    return this.users().some(user => user.expenses?.length);
  });

  isSticky = signal<boolean>(false);
  private refreshSub: Subscription | undefined;

  ngOnInit() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      let uid = decoded?.nameid || decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decoded?.id || decoded?.userId || decoded?.sub;
      this.currentUserId.set(uid ? +uid : undefined);
    }

    this.route.queryParamMap
      .pipe(
        map(params => params.get('roomId')),
        map(id => id ? +id : undefined),
        distinctUntilChanged()
      )
      .subscribe(id => {
        if (!id) {
          this.toast.error('No room selected');
          return;
        }
        if (this.authService.isTokenExpired()) {
          this.authService.clearTokenAndRedirect();
          return;
        }

        this.roomId.set(id);
        this.loadInitialData();
      });

    this.refreshSub = this.expenseService.refresh$.subscribe(() => {
      this.loadMonthlyExpenses();
    });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadInitialData() {
    const currentRoomId = this.roomId();
    if (!currentRoomId) return;

    this.selectedUser.set(undefined);
    this.isLoadingExpenses.set(true);
    this.isLoading.set(true);

    this.expenseService.getExpenses(currentRoomId).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.populateExpenses(response.data);
        } else {
          this.toast.error(response.message || 'Failed to load expenses');
        }
        this.isLoadingExpenses.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.isLoadingExpenses.set(false);
        this.toast.error('Failed to load expenses');
      }
    });
  }

  populateExpenses(data: any) {
    if (data.roomName) this.roomName.set(data.roomName);

    if (data.availableMonths?.length) {
      this.months.set(data.availableMonths.map((month: string) => {
        const [year, monthNum] = month.split('-');
        return new Date(Number(year), Number(monthNum) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      }));
    }

    this.groups.set([{ roomId: this.roomId(), name: this.roomName() || 'Unnamed Room' }]);

    const newUsers = data.membersSummary.map((member: any) => ({
      ...member,
      expenses: []
    }));
    this.users.set(newUsers);

    this.selectedMonth.set(data.selectedMonth
      ? new Date(data.selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
      : this.months()[this.months().length - 1] || '');

    if (!this.selectedUser()) {
      const currentUserInRoom = newUsers.find((u: any) => u.memberId === this.currentUserId());
      this.selectedUser.set(currentUserInRoom ? currentUserInRoom.memberId : newUsers[0]?.memberId);
    }

    this.expenses.set(data.expenses);
    this.assignExpensesToUsers(data.expenses);
    this.prepareGroupedExpenses();

    const currentUser = this.selectedUser();
    if (currentUser) {
      this.loadSettlementsForUser(currentUser);
    }
  }

  loadMonthlyExpenses() {
    const currentRoomId = this.roomId();
    const currentSelectedMonth = this.selectedMonth();
    if (!currentRoomId || !currentSelectedMonth) return;
    
    this.isLoadingExpenses.set(true);

    const [monthName, year] = currentSelectedMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;

    this.expenseService.getExpenses(currentRoomId, formattedMonth).subscribe({
      next: (response: any) => {
        this.isLoadingExpenses.set(false);
        if (response.success && response.data) {
          this.populateExpenses(response.data);
        }
      },
      error: () => {
        this.isLoadingExpenses.set(false);
        this.toast.error(`Error fetching monthly expenses`);
      }
    });
  }

  assignExpensesToUsers(expenses: Expense[]) {
    const currentUsers = [...this.users()];
    currentUsers.forEach(u => (u.expenses = []));
    
    expenses.forEach(exp => {
      const user = currentUsers.find(u => u.memberId === exp.payerId);
      if (user) {
        const date = new Date(exp.date);
        user.expenses.push({
          ...exp,
          date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          originalDate: exp.date.split('T')[0]
        });
      }
    });
    this.users.set(currentUsers);
  }

  previousMonth() {
    const currentIndex = this.months().indexOf(this.selectedMonth());
    if (currentIndex < this.months().length - 1) {
      this.selectedMonth.set(this.months()[currentIndex + 1]);
      this.loadMonthlyExpenses();
    }
  }

  nextMonth() {
    const currentIndex = this.months().indexOf(this.selectedMonth());
    if (currentIndex > 0) {
      this.selectedMonth.set(this.months()[currentIndex - 1]);
      this.loadMonthlyExpenses();
    }
  }

  async openEditExpenseModal(expense: Expense) {
    const modal = await this.modalCtrl.create({
      component: EditExpenseModal,
      componentProps: { expense, groups: this.groups() },
      breakpoints: [0, 0.75],
      initialBreakpoint: 0.75,
      cssClass: 'edit-modal'
    });

    await modal.present();
  }

  async deleteExpense(expense: any, slidingItem: IonItemSliding) {
    await slidingItem.close();

    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
      backdropDismiss: true,
      cssClass: 'global-modal',
      mode: 'ios',
      componentProps: {
        message: `Do you want to remove <strong>${expense.item}</strong>?`,
        confirmText: 'Delete',
        danger: true
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data === true) {
      await Haptics.impact({ style: ImpactStyle.Medium });

      this.expenseService.deleteExpense(expense.expenseId).subscribe({
        next: (res) => {
          if (res.success) {
            this.toast.success(res.message);
          }
        },
        error: () => {
          this.toast.error('Could not delete expense');
        }
      });
    }
  }

  private getFormattedMonth(): string | undefined {
    const currentMonth = this.selectedMonth();
    if (!currentMonth) return undefined;

    const [monthName, year] = currentMonth.split(' ');
    const tempDate = new Date(`${monthName} 1, ${year}`);
    if (isNaN(tempDate.getTime())) return undefined;

    const monthIndex = tempDate.getMonth() + 1;
    return `${year}-${monthIndex.toString().padStart(2, '0')}`;
  }

  async openSettleModal(user: any) {
    const formattedMonth = this.getFormattedMonth();
    const currentSettlementData = this.settlementDataByUser();
    const preloadedSettlements = currentSettlementData[user.memberId] || [];

    const modal = await this.modalCtrl.create({
      component: SettleExpenseModalComponent,
      componentProps: {
        roomId: this.roomId(),
        user,
        formattedMonth,
        preloadedSettlements,
        isPreloaded: preloadedSettlements.length > 0
      },
      breakpoints: [0, 0.65],
      initialBreakpoint: 0.65,
    });

    await modal.present();
  }

  // UI Helpers
  selectUser(id: number) {
    this.selectedUser.set(id);
    const currentSettlementData = this.settlementDataByUser();
    const currentLoading = this.settlementLoadingByUser();
    
    if (!currentSettlementData[id] && !currentLoading[id]) {
      this.loadSettlementsForUser(id);
    }
  }

  onScroll(event: any) { 
    this.isSticky.set(event.detail.scrollTop > 150); 
  }

  groupExpensesByDate(expenses: any[]): ExpenseDateGroup[] {
    if (!expenses || expenses.length === 0) return [];

    const sortedExpenses = [...expenses].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const groups: { [key: string]: any[] } = {};

    sortedExpenses.forEach(exp => {
      const dateKey = this.formatGroupDate(exp.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(exp);
    });

    return Object.keys(groups)
      .sort((a, b) => this.getDatePriority(a) - this.getDatePriority(b))
      .map(date => ({
        date,
        expenses: groups[date]
      }));
  }

  formatGroupDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  }

  private getDatePriority(label: string): number {
    if (label === 'Today') return 0;
    if (label === 'Yesterday') return 1;
    return 2;
  }

  prepareGroupedExpenses() {
    const currentUsers = this.users();
    if (!currentUsers) return;
    
    const newMap: { [userId: number]: ExpenseDateGroup[] } = {};
    currentUsers.forEach(user => {
      newMap[user.memberId] = this.groupExpensesByDate(user.expenses || []);
    });
    this.groupedExpensesMap.set(newMap);
  }

  loadSettlementsForUser(memberId: number) {
    const currentSelectedMonth = this.selectedMonth();
    const currentRoomId = this.roomId();
    if (!currentSelectedMonth || !currentRoomId) return;

    const [monthName, year] = currentSelectedMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;

    this.settlementLoadingByUser.update(state => ({ ...state, [memberId]: true }));

    this.expenseService
      .getSettlementDetails(currentRoomId, memberId, formattedMonth)
      .subscribe({
        next: (response: SettlementResponse) => {
          this.settlementDataByUser.update(state => ({ 
            ...state, 
            [memberId]: response?.data?.settlements || [] 
          }));
          this.settlementLoadingByUser.update(state => ({ ...state, [memberId]: false }));
        },
        error: () => {
          this.settlementLoadingByUser.update(state => ({ ...state, [memberId]: false }));
        }
      });
  }

  async openAddMemberModal() {
    const currentRoomId = this.roomId();
    if (!currentRoomId) return;

    const modal = await this.modalCtrl.create({
      component: AddMemberModalComponent,
      componentProps: { roomId: currentRoomId },
      breakpoints: [0, 0.5, 0.55, 1],
      initialBreakpoint: 0.55,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
  }

  openRoomSettings() {
  }
}