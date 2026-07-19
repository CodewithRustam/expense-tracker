import { Component, OnInit, OnDestroy } from '@angular/core';
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
})
export class ExpensesPage implements OnInit, OnDestroy {
  months: string[] = [];
  users: any[] = [];
  selectedMonth: string = '';
  selectedUser: number | undefined;
  roomId: number | undefined;
  roomName: string = '';
  isLoading: boolean = true;
  isLoadingExpenses: boolean = false;
  groups: { roomId: number | undefined; name: string }[] = [];
  expenses: Expense[] = [];
  skeletonMemberCount: number[] = Array(4).fill(0).map((_, i) => i + 1);

  isNextMonthDisabled = false;
  isPrevMonthDisabled = false;
  isSticky: boolean = false;
  currentUserId: number | undefined;
  groupedExpensesMap: { [userId: number]: ExpenseDateGroup[] } = {};

  settlementDataByUser: { [memberId: number]: SettlementDetail[] } = {};
  settlementLoadingByUser: { [memberId: number]: boolean } = {};
  private refreshSub: Subscription | undefined;

  constructor(
    private expenseService: ExpenseService,
    private route: ActivatedRoute,
    private toast: Toastservice,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private groupService: GroupService
  ) { }

  ngOnInit() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      let uid = decoded?.nameid || decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decoded?.id || decoded?.userId || decoded?.sub;
      this.currentUserId = uid ? +uid : undefined;
    }

    this.route.queryParamMap
      .pipe(
        map(params => params.get('roomId')),
        map(id => id ? +id : undefined),
        distinctUntilChanged()
      )
      .subscribe(roomId => {
        if (!roomId) {
          this.toast.error('No room selected');
          return;
        }
        if (this.authService.isTokenExpired()) {
          this.authService.clearTokenAndRedirect();
          return;
        }

        this.roomId = roomId;
        this.loadInitialData();
      });

    this.refreshSub = this.expenseService.refresh$.subscribe(() => {
      this.loadMonthlyExpenses();
      this.prepareGroupedExpenses();
    });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadInitialData() {
    if (!this.roomId) return;

    this.selectedUser = undefined;

    this.isLoadingExpenses = true;
    this.isLoading = true;

    this.expenseService.getExpenses(this.roomId).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.populateExpenses(response.data);
        } else {
          this.toast.error(response.message || 'Failed to load expenses');
        }
        this.isLoadingExpenses = false;
      },
      error: () => {
        this.isLoading = false;
        this.isLoadingExpenses = false;
        this.toast.error('Failed to load expenses');
      }
    });
  }

  populateExpenses(data: any) {
    if (data.roomName) this.roomName = data.roomName;

    if (data.availableMonths?.length) {
      this.months = data.availableMonths.map((month: string) => {
        const [year, monthNum] = month.split('-');
        return new Date(Number(year), Number(monthNum) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      });
    }

    this.groups = [{ roomId: this.roomId, name: this.roomName || 'Unnamed Room' }];

    this.users = data.membersSummary.map((member: any) => ({
      ...member,
      expenses: []
    }));

    this.selectedMonth = data.selectedMonth
      ? new Date(data.selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
      : this.months[this.months.length - 1] || '';

    const currentIndex = this.months.indexOf(this.selectedMonth);
    this.isNextMonthDisabled = (currentIndex === 0);
    this.isPrevMonthDisabled = (currentIndex === this.months.length - 1);

    if (!this.selectedUser) {
      const currentUserInRoom = this.users.find(u => u.memberId === this.currentUserId);
      this.selectedUser = currentUserInRoom ? currentUserInRoom.memberId : this.users[0]?.memberId;
    }

    this.expenses = data.expenses;
    this.assignExpensesToUsers(data.expenses);
    this.prepareGroupedExpenses();

    // Only preload settlements for the currently selected user; other users'
    // settlement data loads lazily when selected (see selectUser()). Previously
    // this looped over every user AND loaded the selected user again, firing
    // duplicate network requests on every page load.
    if (this.selectedUser) {
      this.loadSettlementsForUser(this.selectedUser);
    }
  }

  loadMonthlyExpenses() {
    if (!this.roomId || !this.selectedMonth) return;
    this.isLoadingExpenses = true;

    const [monthName, year] = this.selectedMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;

    this.expenseService.getExpenses(this.roomId, formattedMonth).subscribe({
      next: (response: any) => {
        this.isLoadingExpenses = false;
        if (response.success && response.data) {
          this.populateExpenses(response.data);
        }
      },
      error: () => {
        this.isLoadingExpenses = false;
        this.toast.error(`Error fetching monthly expenses`);
      }
    });
  }

  assignExpensesToUsers(expenses: Expense[]) {
    this.users.forEach(u => (u.expenses = []));
    expenses.forEach(exp => {
      const user = this.users.find(u => u.memberId === exp.payerId);
      if (user) {
        const date = new Date(exp.date);
        user.expenses.push({
          ...exp,
          date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          originalDate: exp.date.split('T')[0]
        });
      }
    });
  }

  get totalAllTime(): number {
    return this.users.reduce((sum, user) => sum + user.totalMemberExpense, 0);
  }
  get averageAmount(): number {
    return this.users.length ? this.totalAllTime / this.users.length : 0;
  }
  previousMonth() {
    const currentIndex = this.months.indexOf(this.selectedMonth);
    if (currentIndex < this.months.length - 1) {
      this.selectedMonth = this.months[currentIndex + 1];
      this.loadMonthlyExpenses();
    }
  }

  nextMonth() {
    const currentIndex = this.months.indexOf(this.selectedMonth);
    if (currentIndex > 0) {
      this.selectedMonth = this.months[currentIndex - 1];
      this.loadMonthlyExpenses();
    }
  }

  async openEditExpenseModal(expense: Expense) {
    const modal = await this.modalCtrl.create({
      component: EditExpenseModal,
      componentProps: { expense, groups: this.groups },
      breakpoints: [0, 0.75],
      initialBreakpoint: 0.75,
      cssClass: 'edit-modal'
    });

    await modal.present();
  }

  hasExpensesInSelectedMonth(): boolean {
    return this.users.some(user => user.expenses?.length);
  }

  async deleteExpense(expense: any, slidingItem: IonItemSliding) {
    // Close the slider immediately to prevent UI glitches during modal animation
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
    if (!this.selectedMonth) {
      return undefined;
    }

    const [monthName, year] = this.selectedMonth.split(' ');
    const tempDate = new Date(`${monthName} 1, ${year}`);
    if (isNaN(tempDate.getTime())) {
      return undefined;
    }

    const monthIndex = tempDate.getMonth() + 1;
    return `${year}-${monthIndex.toString().padStart(2, '0')}`;
  }

  async openSettleModal(user: any) {
    const formattedMonth = this.getFormattedMonth();

    const preloadedSettlements = this.settlementDataByUser[user.memberId] || [];

    const modal = await this.modalCtrl.create({
      component: SettleExpenseModalComponent,
      componentProps: {
        roomId: this.roomId,
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
    this.selectedUser = id;
    // Lazy-load settlement details the first time this user is viewed,
    // instead of loading every user's settlements up front on page load.
    if (!this.settlementDataByUser[id] && !this.settlementLoadingByUser[id]) {
      this.loadSettlementsForUser(id);
    }
  }

  onScroll(event: any) { this.isSticky = event.detail.scrollTop > 150; }



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

  getGroupedExpenses(user: any): ExpenseDateGroup[] {
    return this.groupExpensesByDate(user.expenses);
  }

  prepareGroupedExpenses() {
    if (!this.users) return;
    this.users.forEach(user => {
      this.groupedExpensesMap[user.memberId] =
        this.groupExpensesByDate(user.expenses || []);
    });
  }

  loadSettlementsForUser(memberId: number) {
    if (!this.selectedMonth) return;

    const [monthName, year] = this.selectedMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;

    this.settlementLoadingByUser[memberId] = true;

    this.expenseService
      .getSettlementDetails(this.roomId!, memberId, formattedMonth)
      .subscribe({
        next: (response: SettlementResponse) => {
          this.settlementDataByUser[memberId] = response?.data?.settlements || [];
          this.settlementLoadingByUser[memberId] = false;
        },
        error: () => {
          this.settlementLoadingByUser[memberId] = false;
        }
      });
  }

  async openAddMemberModal() {
    if (!this.roomId) return;

    const modal = await this.modalCtrl.create({
      component: AddMemberModalComponent,
      componentProps: { roomId: this.roomId },
      breakpoints: [0, 0.5, 0.55, 1],
      initialBreakpoint: 0.55,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.added) {
      // groupService.refresh$ (if addMember triggers it) will handle this automatically.
    }
  }

  openRoomSettings() {
    // navigate to a dedicated room settings page for add/remove members, rename room, leave room
  }
}