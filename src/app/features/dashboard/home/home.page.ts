import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, Platform } from '@ionic/angular';
import { AddExpenseModalComponent } from '../../../add-expense/add-expense.component';
import { Group } from '../../../core/models/group.model';
import { GroupService } from '../../../core/services/group';
import { AuthService } from '../../../core/services/auth-service';
import { NotificationService } from '../../../core/services/notification-service';
import { AddGroupModalComponent } from '../../../shared/modals/add-group-modal/add-group-modal.component';
import { NotificationListModal } from '../../../shared/modals/notification-list-modal/notification-list-modal.component';
import { AppComponent } from '../../../app.component';
import { ExpenseService } from '../../../core/services/expense';
import { Subscription, merge } from 'rxjs';
import { getBaseTrendChartOptions, ChartOptions } from '../../../core/utils/chart.config';

@Component({
  selector: 'app-groups',
  templateUrl: './home.page.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage implements OnInit, OnDestroy {
  // Inject services
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  public groupService = inject(GroupService);
  private expenseService = inject(ExpenseService);
  private authService = inject(AuthService);
  public notificationService = inject(NotificationService);
  private appComponent = inject(AppComponent);
  private platform = inject(Platform);

  // Modern Signal State
  public greetingText = signal<string>('Hello,');
  public userName = signal<string>('User');
  public selectedGroup = signal<Group | null>(null);
  public chartOptions = signal<ChartOptions>(getBaseTrendChartOptions());

  // Computed Values
  public totalBalance = computed(() => {
    return this.groupService.groups().reduce((sum, group) => sum + (group.totalAmount || 0), 0);
  });
  public hasInitiallyLoaded = signal<boolean>(false);
  public renderChart = signal<boolean>(false);
  public playHeaderAnim = signal<boolean>(false);

  public isPageLoaded = computed(() => {
    if (this.hasInitiallyLoaded()) return true;

    const groupsLoaded = !this.groupService.isLoading();
    if (!groupsLoaded) return false;
    
    const hasGroups = this.groupService.groups().length > 0;
    if (!hasGroups) return true;
    
    return this.chartOptions().series.length > 0;
  });

  private refreshSubscription: Subscription | undefined;

  constructor() {
    // Effect to auto-select first group when loaded
    effect(() => {
      const groups = this.groupService.groups();
      const currentSelected = untracked(() => this.selectedGroup());
      
      if (groups.length > 0) {
        if (!currentSelected) {
          untracked(() => {
            this.selectedGroup.set(groups[0]);
            this.fetchTrendData(groups[0].roomId);
          });
        } else {
          // Update reference to get new totals if it exists
          const updated = groups.find(g => g.roomId === currentSelected.roomId);
          if (updated) {
            untracked(() => {
              this.selectedGroup.set(updated);
              this.fetchTrendData(updated.roomId);
            });
          }
        }
      }
    });
  }

  ngOnInit() {
    this.updateGreeting();
    this.setUserNameFromToken();

    if (this.platform.is('capacitor')) {
      this.appComponent.initPush();
    }

    // Unified Reactive Refresh
    this.refreshSubscription = merge(
      this.groupService.refresh$,
      this.expenseService.refresh$
    ).subscribe(() => {
      this.groupService.loadGroups();
      this.notificationService.getAll().subscribe();
    });
  }

  // Chart Cache
  private cachedSeries = signal<any[]>([]);
  private cachedCategories = signal<string[]>([]);

  ionViewWillEnter() {
    this.playHeaderAnim.set(false);
    setTimeout(() => this.playHeaderAnim.set(true), 10);

    this.notificationService.getAll().subscribe();
    this.groupService.loadGroups();
    const current = this.selectedGroup();
  }

  ionViewDidEnter() {
    const current = this.selectedGroup();
    if (current) {
      if (this.cachedSeries().length > 0) {
        // Delay slightly to ensure transition is fully done before drawing
        setTimeout(() => this.renderChart.set(true), 50);
      }
      // Fetch fresh data in background
      this.fetchTrendData(current.roomId);
    }
  }

  ionViewWillLeave() {
    // Destroy chart on leave to prepare for a fresh animation on next visit
    this.renderChart.set(false);
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  async openAddGroupModal() {
    const modal = await this.modalCtrl.create({
      component: AddGroupModalComponent,
      breakpoints: [0, 0.5, 0.9],
      initialBreakpoint: 0.5,
      cssClass: 'bottom-sheet-modal'
    });
    await modal.present();
  }

  applyChartData() {
    this.hasInitiallyLoaded.set(true);
    const currentOptions = this.chartOptions();
    this.chartOptions.set({
      ...currentOptions,
      series: this.cachedSeries(),
      xaxis: {
        ...currentOptions.xaxis,
        categories: this.cachedCategories()
      }
    });
    this.renderChart.set(true);
  }

  fetchTrendData(roomId: number) {
    this.expenseService.getRoomTrend(roomId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const trendData = res.data;
          const categories = trendData.map((item: any) => item.monthName);
          const seriesData = trendData.map((item: any) => item.total);

          const currentCachedSeries = this.cachedSeries();
          const currentCachedCategories = this.cachedCategories();
          
          const isSameData = currentCachedSeries.length > 0 && 
                             JSON.stringify(currentCachedSeries[0]?.data) === JSON.stringify(seriesData) && 
                             JSON.stringify(currentCachedCategories) === JSON.stringify(categories);

          if (!isSameData) {
            this.cachedCategories.set(categories);
            this.cachedSeries.set([{
              name: this.selectedGroup()?.name || 'Expenses',
              data: seriesData
            }]);

            this.applyChartData();
          }
        }
      },
      error: (err) => console.error('Trend API Error:', err)
    });
  }

  async openAddExpense() {
    if (this.groupService.isLoading()) return;
    const modal = await this.modalCtrl.create({
      component: AddExpenseModalComponent,
      componentProps: { groups: this.groupService.groups() },
      breakpoints: [0, 0.77],
      initialBreakpoint: 0.77
    });

    await modal.present();
  }

  onGroupChange(event: any) {
    const group = event.detail.value;
    this.selectedGroup.set(group);
    if (group) {
      this.fetchTrendData(group.roomId);
    }
  }

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) this.greetingText.set('Good Morning,');
    else if (hour >= 12 && hour < 17) this.greetingText.set('Good Afternoon,');
    else if (hour >= 17 && hour < 21) this.greetingText.set('Good Evening,');
    else this.greetingText.set('Good Night,');
  }

  async openNotifications() {
    const modal = await this.modalCtrl.create({
      component: NotificationListModal,
      mode: 'ios',
      cssClass: 'notification-modal'
    });
    await modal.present();
  }

  goToDetails(group: Group) {
    this.router.navigate(['tabs/expenses'], { queryParams: { roomId: group.roomId } });
  }

  openAnalytics() {
    this.router.navigate(['tabs/charts']);
  }

  goToProfile() {
    this.router.navigate(['tabs/profile']);
  }

  setUserNameFromToken() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      if (decoded?.unique_name) this.userName.set(decoded.unique_name);
    }
  }

  getGroupColorClass(type: string): string {
    const t = type?.toLowerCase() || '';
    if (t.includes('travel')) return 'travel';
    if (t.includes('food')) return 'food';
    if (t.includes('home')) return 'home';
    return '';
  }
}