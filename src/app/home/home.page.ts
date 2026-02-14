import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, Platform } from '@ionic/angular';
import { AddExpenseModalComponent } from '../add-expense/add-expense.component';
import { Group } from '../models/group.model';
import { GroupService } from '../services/group';
import { AuthService } from '../services/auth-service';
import { NotificationService } from '../services/notification-service';
import { NotificationListModal } from '../modals/notification-list-modal/notification-list-modal.component';
import { AppComponent } from '../app.component';
import { ExpenseService } from '../services/expense';
import { Subscription, merge } from 'rxjs';


import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexFill,
  ApexPlotOptions,
  ApexYAxis,
  ApexGrid
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  fill: ApexFill;
  plotOptions: ApexPlotOptions;
  colors: string[];
  grid: ApexGrid;
};
@Component({
  selector: 'app-groups',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  greetingText: string = 'Hello,';
  groups: Group[] = [];
  isLoading: boolean = true;
  userName: string = 'User';
  unreadCount = 0;

  public chartOptions: Partial<ChartOptions> | any;
  selectedGroup: Group | null = null;

  private refreshSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private groupService: GroupService,
    private expenseService: ExpenseService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private appComponent: AppComponent,
    private platform: Platform
  ) {
    this.initChart();
  }

  ngOnInit() {
    this.updateGreeting();
    this.setUserNameFromToken();

    if (this.platform.is('capacitor')) {
      this.appComponent.initPush();
    }

    // 1. Listen for Unread Notifications
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    // 2. ✅ Unified Reactive Refresh
    // Listen to BOTH group changes and expense changes
    this.refreshSubscription = merge(
      this.groupService.refresh$,
      this.expenseService.refresh$
    ).subscribe(() => {
      // Background refresh on data changes
      this.loadGroups(true);
      this.loadNotifications(true);
    });

    // 3. Initial Load
    this.loadGroups();
    this.loadNotifications();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  loadGroups(isBackground = false) {
    if (!isBackground) {
      this.isLoading = true;
      this.groups = [];
    }

    this.groupService.getGroups().subscribe({
      next: (res: any) => {
        // Handle both Array response or {success, data} response
        const data = Array.isArray(res) ? res : res.data;
        const success = Array.isArray(res) ? true : res.success;

        if (success && data?.length > 0) {
          this.groups = data;

          // Only auto-select first group if none is selected yet
          if (!this.selectedGroup) {
            this.selectedGroup = this.groups[0];
          } else {
            // Update the reference to the currently selected group to get new totals
            this.selectedGroup = this.groups.find(g => g.roomId === this.selectedGroup?.roomId) || this.groups[0];
          }

          this.fetchTrendData(this.selectedGroup.roomId);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching groups', err);
      }
    });
  }

  fetchTrendData(roomId: number) {
    this.expenseService.getRoomTrend(roomId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const trendData = res.data;
          const categories = trendData.map((item: any) => item.monthName);
          const seriesData = trendData.map((item: any) => item.total);

          this.chartOptions.series = [{
            name: this.selectedGroup?.name || 'Expenses',
            data: seriesData
          }];

          this.chartOptions.xaxis = {
            ...this.chartOptions.xaxis,
            categories: categories
          };

          this.chartOptions = { ...this.chartOptions };
        }
      },
      error: (err) => console.error('Trend API Error:', err)
    });
  }

  async openAddExpense() {
    if (this.isLoading) return;
    const modal = await this.modalCtrl.create({
      component: AddExpenseModalComponent,
      componentProps: { groups: this.groups },
      breakpoints: [0, 0.88],
      initialBreakpoint: 0.88,
      handle: false,
    });

    await modal.present();
    // ✅ No manual refresh logic needed here! 
    // The modal internal logic calls addExpense(), 
    // which triggers refresh$, which this page listens to.
  }

  onGroupChange(event: any) {
    this.selectedGroup = event.detail.value;
    if (this.selectedGroup) {
      this.fetchTrendData(this.selectedGroup.roomId);
    }
  }

  loadNotifications(isBackground: boolean = false) {
    this.notificationService.getAll().subscribe();
  }

  // ... (Rest of UI helper methods like updateGreeting, getGroupColorClass, etc. remain the same)

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) this.greetingText = 'Good Morning,';
    else if (hour >= 12 && hour < 17) this.greetingText = 'Good Afternoon,';
    else if (hour >= 17 && hour < 21) this.greetingText = 'Good Evening,';
    else this.greetingText = 'Good Night,';
  }

  async openNotifications() {
    const modal = await this.modalCtrl.create({
      component: NotificationListModal,
      mode: 'ios',
      cssClass: 'notification-modal'
    });
    await modal.present();
  }

  getTotalBalance(): number {
    return this.groups.reduce((sum, group) => sum + (group.totalAmount || 0), 0);
  }

  goToDetails(group: Group) {
    this.router.navigate(['tabs/expenses'], { queryParams: { roomId: group.roomId } });
  }

  goToProfile() {
    this.router.navigate(['tabs/profile']);
  }

  setUserNameFromToken() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      if (decoded?.unique_name) this.userName = decoded.unique_name;
    }
  }

  getGroupColorClass(type: string): string {
    const t = type?.toLowerCase() || '';
    if (t.includes('travel')) return 'travel';
    if (t.includes('food')) return 'food';
    if (t.includes('home')) return 'home';
    return '';
  }

  initChart() {
    this.chartOptions = {
      series: [],
      chart: {
        type: "bar",
        height: 240,
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 800 }
      },
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: "75%", distributed: true }
      },
      dataLabels: { enabled: false },
      colors: ["#6366f1", "#4ade80", "#f87171", "#fbbf24", "#a855f7", "#2dd4bf"],
      xaxis: {
        categories: [],
        labels: { style: { colors: "#94a3b8", fontSize: '11px', fontWeight: 500 } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        show: true,
        labels: {
          style: { colors: "#94a3b8", fontSize: '10px' },
          formatter: (val: number) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val
        }
      },
      grid: {
        show: true,
        borderColor: "rgba(255, 255, 255, 0.05)",
        strokeDashArray: 4,
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        theme: "dark",
        y: { formatter: (val: number) => `₹${val.toLocaleString('en-IN')}` }
      },
      fill: {
        type: 'gradient',
        gradient: { shade: 'dark', type: "vertical", opacityFrom: 1, opacityTo: 0.9 }
      }
    };
  }
}