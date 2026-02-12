import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExpenseService, ExpenseResponse } from '../services/expense';
import { IonItemSliding, ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth-service';
import { EditExpenseModal } from '../modals/edit-expense-modal/edit-expense-modal.component';
import { SettleExpenseModalComponent } from '../modals/settle-expense-modal/settle-expense-modal.component';
import { Toastservice } from '../services/toastservice';
import { GlobalModalComponent } from '../modals/global-modal/global-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GroupService } from '../services/group';
import { distinctUntilChanged, map } from 'rxjs';

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
  originalDate: string
}

interface ExpenseData {
  roomId: number;
  roomName?: string;
  membersSummary: {
    memberId: number;
    memberName: string;
    totalMemberExpense: number;
    netBalance: number;
    badgeText: string;
    badgeAmount: number;
    amountReceived: number;
    amountPaid: number;
    isSettleShow: boolean;
  }[];
  availableMonths?: string[];
  selectedMonth: string;
  totalMontlyExpense: number;
  expenses: Expense[];
}

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss'],
  standalone: false,
})
export class ExpensesPage implements OnInit {
  months: string[] = [];
  users: {
    memberId: number;
    memberName: string;
    totalMemberExpense: number;
    amountReceived: number;
    amountPaid: number;
    netBalance: number;
    badgeText: string;
    badgeAmount: number;
    isSettleShow: boolean
    expenses: Expense[];
  }[] = [];

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
  private isSwiping = false;
  private hasInitialLoadRun = false;

  constructor(
    private expenseService: ExpenseService,
    private route: ActivatedRoute,
    private toast: Toastservice,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private groupService: GroupService
  ) { }

  ngOnInit() {
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
  }

  loadInitialData() {
    if (!this.roomId) return;
    this.isLoadingExpenses = true;
    this.isLoading = true;

    this.expenseService.getExpenses(this.roomId).subscribe({
      next: (response: ExpenseResponse) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.populateExpenses(response.data);
        } else {
          this.toast.error(response.message || 'Failed to load expenses');
        }
        this.isLoadingExpenses = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.isLoadingExpenses = false;
        this.toast.error('Failed to load expenses');
      }
    });
  }

  populateExpenses(data: ExpenseData) {
    if (data.roomName) this.roomName = data.roomName;
    if (data.availableMonths?.length) {
      this.months = data.availableMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return new Date(Number(year), Number(monthNum) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      });
    }

    // Updated to use roomId and roomName from ExpenseData
    this.groups = [{ roomId: this.roomId, name: this.roomName || 'Unnamed Room' }];

    this.users = data.membersSummary.map(member => ({
      memberId: member.memberId,
      memberName: member.memberName,
      netBalance: member.netBalance,
      totalMemberExpense: member.totalMemberExpense,
      badgeText: member.badgeText,
      badgeAmount: member.badgeAmount,
      amountReceived: member.amountReceived,
      amountPaid: member.amountPaid,
      isSettleShow: member.isSettleShow,
      expenses: []
    }));

    this.selectedMonth = data.selectedMonth
      ? new Date(data.selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
      : this.months[this.months.length - 1] || '';

    const currentIndex = this.months.indexOf(this.selectedMonth);
    if (currentIndex === 0) {
      this.isNextMonthDisabled = true;
      this.isPrevMonthDisabled = false;
    }

    this.selectedUser = this.users[0]?.memberId;

    this.expenses = data.expenses;
    this.assignExpensesToUsers(data.expenses);
  }

  loadMonthlyExpenses() {
    if (!this.roomId || !this.selectedMonth) return;
    this.users.forEach(u => u.expenses = []);

    this.isLoadingExpenses = true;

    const [monthName, year] = this.selectedMonth.split(' ');
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;

    this.expenseService.getExpenses(this.roomId, formattedMonth).subscribe({
      next: (response: ExpenseResponse) => {
        this.isLoadingExpenses = false;

        if (response.success && response.data) {
          this.populateExpenses(response.data);
        } else {
          this.toast.error(response.message || 'Failed to load monthly expenses');
        }
      },
      error: (error) => {
        this.isLoadingExpenses = false;
        this.toast.error(`Error fetching monthly expenses for ${this.selectedMonth}`);
      }
    });
  }

  assignExpensesToUsers(expenses: Expense[]) {
    this.users.forEach(u => (u.expenses = []));
    expenses.forEach(exp => {
      const user = this.users.find(u => u.memberId === exp.payerId);
      if (user) {
        const date = new Date(exp.date);
        const orgDate = exp.date.split('T')[0];
        user.expenses.push({
          expenseId: exp.expenseId,
          roomId: exp.roomId,
          item: exp.item,
          payerId: exp.payerId,
          payerName: exp.payerName,
          date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          amount: exp.amount,
          iconName: exp.iconName,
          category: exp.category,
          isEditShow: exp.isEditShow,
          originalDate: orgDate
        });
      }
    });
  }

  selectUser(id: number) {
    this.selectedUser = id;
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

    // Disable previous button when on the last month
    this.isPrevMonthDisabled = currentIndex + 1 === this.months.length - 1;

    // Enable next button again
    this.isNextMonthDisabled = false;
  }

  nextMonth() {
    const currentIndex = this.months.indexOf(this.selectedMonth);
    if (currentIndex > 0) {
      this.selectedMonth = this.months[currentIndex - 1];
      this.loadMonthlyExpenses();
    }

    // Disable next button when on the first month
    this.isNextMonthDisabled = currentIndex - 1 === 0;

    // Enable previous button again
    this.isPrevMonthDisabled = false;
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
  async openEditExpenseModal(expense: Expense) {
    const formattedExpense = {
      ...expense
    };

    const modal = await this.modalCtrl.create({
      component: EditExpenseModal,
      componentProps: {
        expense: formattedExpense,
        groups: this.groups
      },
      breakpoints: [0, 0.85],
      initialBreakpoint: 0.85,
      handle: false,
      presentingElement: await this.modalCtrl.getTop(),
      cssClass: 'edit-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.refresh) {
        this.loadMonthlyExpenses();
      } else if (result.data) {
        // Update the local expenses array with the updated expense
        const index = this.expenses.findIndex(e => e.expenseId === result.data.expenseId);
        if (index !== -1) {
          const updatedExpense = {
            ...this.expenses[index],
            ...result.data,
            date: new Date(result.data.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            originalDate: result.data.date
          };
          this.expenses[index] = updatedExpense;
          this.assignExpensesToUsers(this.expenses);
        }
      }

      this.groupService.triggerRefresh();
      this.expenseService.notifyDataChanged();
    });
    return await modal.present();
  }
  async openSettleModal(user: {
    memberId: number;
    memberName: string;
    netBalance: number;
  }) {
    if (!this.roomId) {
      this.toast.error('No room selected');
      return;
    }

    // Convert "October 2025" → "YYYY-MM"
    let formattedMonth: string | undefined;
    if (this.selectedMonth) {
      const [monthName, year] = this.selectedMonth.split(' ');
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      formattedMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;
    }

    const modal = await this.modalCtrl.create({
      component: SettleExpenseModalComponent,
      componentProps: {
        roomId: this.roomId,
        user,
        formattedMonth
      },
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.77,
      handle: false,
      //cssClass: 'settle-modal',
    });

    await modal.present();

    // Handle confirmation on modal close
    modal.onDidDismiss().then((result) => {
      if (result.data?.confirmed && result.data.settlements) {
        this.loadInitialData();
      }
    });
  }

  hasExpensesInSelectedMonth(): boolean {
    return this.users.some(user => user.expenses?.length);
  }
  async deleteExpense(expense: any, slidingItem: IonItemSliding) {
    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
      cssClass: 'global-modal',
      mode: 'ios',
      componentProps: {
        message: `Do you want to remove this item?<br><strong>${expense.item}</strong>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data === true) {
      // --- TRIGGER MEDIUM HAPTIC ON CONFIRM ---
      await Haptics.impact({ style: ImpactStyle.Medium });

      this.expenseService.deleteExpense(expense.expenseId).subscribe({
        next: (res) => {
          slidingItem.close();
          if (res.success) {
            const user = this.users.find(u => u.memberId === this.selectedUser);
            if (user) {
              user.expenses = user.expenses.filter(e => e.expenseId !== expense.expenseId);
            }
            this.expenseService.notifyDataChanged();
            this.toast.success(res.message);
          } else {
            this.toast.warning(res.message);
          }
        },
        error: (err) => {
          slidingItem.close();
          this.toast.error('Could not delete expense');
        }
      });
    } else {
      slidingItem.close();
    }
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.isSticky = scrollTop > 150;
  }

  async onItemDrag(event: any) {
    const ratio = event.detail.ratio;

    if (!this.isSwiping && Math.abs(ratio) > 0.1) {
      this.isSwiping = true;
      await Haptics.impact({ style: ImpactStyle.Light });
    }

    if (ratio === 0) {
      this.isSwiping = false;
    }
  }
}