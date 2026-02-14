import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ApexNonAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexResponsive,
  ApexLegend,
  ApexPlotOptions,
} from 'ng-apexcharts';
import { ExpenseService } from '../services/expense';
import { MonthlyExpensesTrendResponse } from '../models/Expense/MonthlyExpensesTrendResponse';
import { CategoryExpenses } from '../models/Expense/CategoryExpenses';
import { TopSpend } from '../models/Expense/TopSpend';
import { GroupService } from '../services/group';
import { Subject, Subscription, from, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
  legend: ApexLegend;
};

@Component({
  selector: 'app-charts',
  templateUrl: './charts.page.html',
  styleUrls: ['./charts.page.scss'],
  standalone: false
})
export class ChartsPage implements OnInit, OnDestroy {
  trendData: MonthlyExpensesTrendResponse = {
    months: [],
    members: [],
    categoryExpenses: [],
    topSpends: []
  };

  groups: any[] = [];
  selectedGroup: any = null;
  currentMonth: string = this.getCurrentMonth();
  currentMonthLabel: string = this.formatMonthLabel(this.currentMonth);
  activeTab: 'categories' | 'topSpends' = 'categories';

  chartOptions: ChartOptions;
  isLoading = true;

  private destroy$ = new Subject<void>();
  private refreshSub: Subscription | undefined;

  constructor(
    private expenseService: ExpenseService,
    private groupService: GroupService
  ) {
    this.chartOptions = this.getDefaultChartOptions();
  }

  ngOnInit() {
    // 1. ✅ Reactive Refresh Listener
    // Automatically reloads data whenever expenses or groups change globally
    this.refreshSub = merge(
      this.expenseService.refresh$,
      this.groupService.refresh$
    ).pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadChartData(true); // Background refresh
      });

    // 2. Initial Load
    this.loadChartData();
  }

  ionViewWillEnter() {
    this.setupColorSchemeListener();
  }

  ionViewWillLeave() {
    // Prevent animation artifacts when navigating away
    this.chartOptions.series = [];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshSub?.unsubscribe();
  }

  // --- Data Loading ---

  loadChartData(isBackground = false) {
    if (!isBackground) this.isLoading = true;

    this.groupService.getGroups().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        // Handle both Array or {success, data} response formats
        const data = Array.isArray(res) ? res : res.data;
        const success = Array.isArray(res) ? true : res.success;

        if (success && data?.length > 0) {
          this.groups = data;

          // Preserve selection on refresh
          if (!this.selectedGroup) {
            this.selectedGroup = this.groups[0];
          } else {
            this.selectedGroup = this.groups.find(g => g.roomId === this.selectedGroup.roomId) || this.groups[0];
          }

          this.loadExpenseTrend(isBackground);
        } else {
          this.isLoading = false;
        }
      },
      error: () => this.isLoading = false
    });
  }

  onGroupChange(event: any) {
    this.selectedGroup = event.detail.value;
    this.loadExpenseTrend();
  }

  loadExpenseTrend(isBackground = false) {
    if (!this.selectedGroup) return;
    if (!isBackground) this.isLoading = true;

    this.expenseService.getMonthlyExpensesTrend(this.selectedGroup.roomId, this.currentMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.trendData = data;
          this.currentMonthLabel = this.formatMonthLabel(this.currentMonth);
          this.updateChart();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Trend API Error:', err);
          this.isLoading = false;
        }
      });
  }

  updateChart() {
    // Reactively update chart series and labels
    this.chartOptions = {
      ...this.chartOptions,
      series: this.trendData.members.map(member => member.monthlyExpenses[0] || 0),
      labels: this.trendData.members.map(member => member.name || 'Unknown')
    };
  }

  // --- Date Logic ---

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private formatMonthLabel(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(year, monthNum - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  previousMonth() {
    const [year, monthNum] = this.currentMonth.split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    date.setMonth(date.getMonth() - 1);
    this.currentMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    this.loadExpenseTrend();
  }

  nextMonth() {
    if (!this.canNavigateNext()) return;
    const [year, monthNum] = this.currentMonth.split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    date.setMonth(date.getMonth() + 1);
    this.currentMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    this.loadExpenseTrend();
  }

  canNavigateNext(): boolean {
    const [year, month] = this.currentMonth.split('-').map(Number);
    const now = new Date();
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  }

  // --- Helpers ---

  switchTab(value: 'categories' | 'topSpends') {
    this.activeTab = value;
  }

  getCategoryTotal(category: CategoryExpenses): number {
    return category.monthlyTotals[0] || 0;
  }

  getTopSpendTotal(topSpend: TopSpend): number {
    return topSpend.monthlyTotals[0] || 0;
  }

  getMonthlyTotal(): number {
    return this.trendData.members.reduce((total, member) => total + (member.monthlyExpenses[0] || 0), 0);
  }
  getLatestDate(monthlyTotals: number[]): Date {
    const [year, month] = this.currentMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
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
      'fa-solid fa-seedling': '#2ecc71'
    };
    return iconMap[iconName || ''] || '#666';
  }

  hasData(): boolean {
    return this.trendData?.members?.some(m => (m.monthlyExpenses[0] || 0) > 0);
  }

  // --- Chart Config ---

  getDefaultChartOptions(): ChartOptions {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDark ? '#ffffff' : '#333333';

    return {
      series: [],
      chart: { type: 'donut', height: 320, background: 'transparent', animations: { enabled: true } },
      labels: [],
      colors: ['#3b82f6', '#64748b', '#10b981', '#6366f1', '#8b5cf6'],
      dataLabels: {
        enabled: true,
        formatter: (val: any) => val.toFixed(0) + '%',
        style: { fontSize: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: '600', colors: ['#fff'] },
        dropShadow: { enabled: false }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '55%',
            labels: {
              show: true,
              name: { color: textColor, fontSize: '14px' },
              value: {
                color: textColor, fontSize: '20px', fontWeight: 700,
                formatter: (val: string) => `₹${Number(val).toLocaleString()}`
              },
              total: {
                show: true, label: 'Total', color: textColor,
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return `₹${total.toLocaleString()}`;
                }
              }
            }
          }
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        labels: { colors: textColor },
        fontFamily: 'Poppins, sans-serif',
        markers: { radius: 12 } as any
      },
      responsive: [{ breakpoint: 480, options: { chart: { height: 280 } } }]
    };
  }

  setupColorSchemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const color = e.matches ? '#ffffff' : '#333333';
      this.chartOptions = {
        ...this.chartOptions,
        plotOptions: {
          ...this.chartOptions.plotOptions,
          pie: {
            ...this.chartOptions.plotOptions.pie,
            donut: {
              ...this.chartOptions.plotOptions.pie?.donut,
              labels: {
                ...this.chartOptions.plotOptions.pie?.donut?.labels,
                name: { ...this.chartOptions.plotOptions.pie?.donut?.labels?.name, color: color },
                value: { ...this.chartOptions.plotOptions.pie?.donut?.labels?.value, color: color },
                total: { ...this.chartOptions.plotOptions.pie?.donut?.labels?.total, color: color }
              }
            }
          }
        },
        legend: { ...this.chartOptions.legend, labels: { colors: color } }
      };
    });
  }
}