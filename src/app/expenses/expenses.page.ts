import { Component, OnInit, OnDestroy } from '@angular/core'; // Added OnDestroy
import { ActivatedRoute } from '@angular/router';
import { ExpenseService } from '../services/expense'; // Ensure ExpenseData is exported in service
import { IonItemSliding, ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth-service';
import { EditExpenseModal } from '../modals/edit-expense-modal/edit-expense-modal.component';
import { SettleExpenseModalComponent } from '../modals/settle-expense-modal/settle-expense-modal.component';
import { Toastservice } from '../services/toastservice';
import { GlobalModalComponent } from '../modals/global-modal/global-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GroupService } from '../services/group';
import { Subscription, distinctUntilChanged, map } from 'rxjs';

// Local interfaces used for UI display
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

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss'],
  standalone: false,
})
export class ExpensesPage implements OnInit, OnDestroy {
  months: string[] = [];
  users: any[] = []; // Simplified for brevity, keep your specific interface if preferred
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
  private currentUserId: number | undefined;

  // Track subscriptions to prevent leaks
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
      console.log(decoded);
      // Ensure your token payload has a field for 'id' or 'memberId'
      // Note: Cast to number if your memberId in DB is numeric
      this.currentUserId = decoded?.nameid ? +decoded.nameid : undefined;
    }

    // 1. Listen for Route Changes
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

    // 2. ✅ Subscribe to Global Refresh Stream
    // Any time add/update/delete/settle happens, this triggers
    this.refreshSub = this.expenseService.refresh$.subscribe(() => {
      this.loadMonthlyExpenses();
    });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadInitialData() {
    if (!this.roomId) return;

    // ✅ Reset selection so populateExpenses recalculates for the new room
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

    // 1. Try to find the logged-in user in the room members
    // 2. If not found (or first load), fallback to the first user in the list
    if (!this.selectedUser) {
      const currentUserInRoom = this.users.find(u => u.memberId === this.currentUserId);
      this.selectedUser = currentUserInRoom ? currentUserInRoom.memberId : this.users[0]?.memberId;
    }

    this.expenses = data.expenses;
    this.assignExpensesToUsers(data.expenses);
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

  // Navigation Logic
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
    // ✅ No need to call loadMonthlyExpenses here; 
    // the Service triggers the refresh$ stream automatically on success.
  }

  hasExpensesInSelectedMonth(): boolean {
    return this.users.some(user => user.expenses?.length);
  }

  async deleteExpense(expense: any, slidingItem: IonItemSliding) {
    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
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
          slidingItem.close();
          if (res.success) {
            this.toast.success(res.message);
            // ✅ Data will auto-refresh via refresh$ subscription
          }
        },
        error: () => {
          slidingItem.close();
          this.toast.error('Could not delete expense');
        }
      });
    } else {
      slidingItem.close();
    }
  }

  async openSettleModal(user: any) {
    let formattedMonth: string | undefined;
    if (this.selectedMonth) {
      const [monthName, year] = this.selectedMonth.split(' ');
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;
    }

    const modal = await this.modalCtrl.create({
      component: SettleExpenseModalComponent,
      componentProps: { roomId: this.roomId, user, formattedMonth },
      initialBreakpoint: 0.77,
    });

    await modal.present();
    // ✅ Refresh handled by service stream
  }

  // UI Helpers
  selectUser(id: number) { this.selectedUser = id; }
  onScroll(event: any) { this.isSticky = event.detail.scrollTop > 150; }
  getIconColor(iconName: string | undefined): string {
    const iconMap: any = { 'fa-solid fa-leaf': '#27ae60', 'fa-solid fa-drumstick-bite': '#e74c3c', 'fa-solid fa-burn': '#f1c40f' };
    return iconMap[iconName!] || '#666';
  }
}