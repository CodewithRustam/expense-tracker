import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, Platform } from '@ionic/angular';
import { AddExpenseModalComponent } from '../add-expense/add-expense.component';
import { Group } from '../models/group.model';
import { GroupService } from '../services/group';
import { AuthService } from '../services/auth-service';
import { NotificationService } from '../services/notification-service';
import { NotificationListModal } from '../modals/notification-list-modal/notification-list-modal.component';
import { AppComponent } from '../app.component';
import { StatusBarService } from '../services/status-bar';
import { ExpenseService } from '../services/expense';

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
export class HomePage {
  greetingText: string = 'Hello,';
  greetingImage: string = '';
  groups: Group[] = [];
  isLoading: boolean = true;
  userName: string = 'User';
  unreadCount = 0;

  public chartOptions: Partial<ChartOptions> | any;
  selectedGroup: Group | null = null;

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private groupService: GroupService,
    private expenseExp: ExpenseService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private appComponent: AppComponent,
    private platform: Platform,
    private statusBar: StatusBarService
  ) {
    this.initChart();
  }

  async ngOnInit() {
    this.updateGreeting();
    this.setUserNameFromToken();

    if (this.platform.is('capacitor')) {
      this.appComponent.initPush();
    }

    // This automatically updates this.unreadCount whenever the service updates
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    // 3. Setup the "Refresh Listener" for Groups/Notifications
    this.groupService.refreshGroups$.subscribe(() => {
      // SILENT background refresh: No resetState(), no skeletons
      this.loadGroups(true);
      this.loadNotifications(true);
    });

    // 4. Initial "Hard" Load
    this.resetState(); // Show skeletons only for the first load
    this.loadGroups();
    this.loadNotifications();
  }

  resetState() {
    this.isLoading = true;
    this.groups = [];
    this.selectedGroup = null;
    if (this.chartOptions) {
      this.chartOptions.series = [];
    }
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
        bar: {
          borderRadius: 4,
          columnWidth: "75%",
          distributed: true,
        }
      },
      dataLabels: { enabled: false },
      colors: ["#6366f1", "#4ade80", "#f87171", "#fbbf24", "#a855f7", "#2dd4bf"],
      xaxis: {
        categories: [],
        labels: {
          style: { colors: "#94a3b8", fontSize: '11px', fontWeight: 500 }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        show: true,
        labels: {
          style: { colors: "#94a3b8", fontSize: '10px' },
          formatter: (val: number) => {
            return val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
          }
        }
      },
      grid: {
        show: true,
        borderColor: "rgba(255, 255, 255, 0.05)",
        strokeDashArray: 4,
        position: 'back',
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        theme: "dark",
        y: { formatter: (val: number) => `₹${val.toLocaleString('en-IN')}` }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: "vertical",
          opacityFrom: 1,
          opacityTo: 0.9,
        }
      }
    };
  }

  loadGroups(isBackground = false) {
    if (!isBackground) this.isLoading = true;

    this.groupService.getGroups().subscribe({
      next: (res) => {
        if (res.success && res.data.length > 0) {
          this.groups = res.data;
          this.selectedGroup = this.groups[0];
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

  onGroupChange(event: any) {
    this.selectedGroup = event.detail.value;
    if (this.selectedGroup) {
      this.fetchTrendData(this.selectedGroup.roomId);
    }
  }

  fetchTrendData(roomId: number) {
    this.expenseExp.getRoomTrend(roomId).subscribe({
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

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) this.greetingText = 'Good Morning,';
    else if (hour >= 12 && hour < 17) this.greetingText = 'Good Afternoon,';
    else if (hour >= 17 && hour < 21) this.greetingText = 'Good Evening,';
    else this.greetingText = 'Good Night,';
  }

  loadNotifications(isBackground: boolean = false) {
    this.notificationService.getAll().subscribe();
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
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.groupService.triggerRefresh();
      this.expenseExp.notifyDataChanged();
    }
  }

  getGroupColorClass(type: string): string {
    const t = type?.toLowerCase() || '';
    if (t.includes('travel')) return 'travel';
    if (t.includes('food')) return 'food';
    if (t.includes('home')) return 'home';
    return '';
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
}