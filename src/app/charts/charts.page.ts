import { Component, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  ApexNonAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexResponsive,
  ApexLegend,
  ApexPlotOptions, // Added explicit import
} from 'ng-apexcharts';
import { ExpenseService, MonthlyExpensesTrendResponse, CategoryExpenses, TopSpend } from '../services/expense';
import { GroupService } from '../services/group';
import { Subject } from 'rxjs';
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
export class ChartsPage implements OnDestroy {
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

  constructor(
    private expenseService: ExpenseService,
    private groupService: GroupService
  ) {
    this.chartOptions = this.getDefaultChartOptions();
  }

  ngOnInit() {
    this.loadChartData();

    this.expenseService.onChartRefresh().subscribe(() => {
      this.loadChartData();
    });
  }

  ionViewWillEnter() {
    this.updateChart();
    this.setupColorSchemeListener();
  }
  ionViewWillLeave() {
    // Empty the series to prevent the chart from "ghosting" or 
    // bubbling during the next entrance animation.
    this.chartOptions.series = [];
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading ---

  loadChartData() {
    this.isLoading = true;
    this.groupService.getGroups().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data.length > 0) {
          this.groups = res.data;
          // Default to first group if not selected
          if (!this.selectedGroup) {
            this.selectedGroup = this.groups[0];
          }
          this.loadExpenseTrend();
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

  loadExpenseTrend() {
    if (!this.selectedGroup) return;

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
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  updateChart() {
    // Map member expenses to chart
    this.chartOptions.series = this.trendData.members.map(member => member.monthlyExpenses[0] || 0);
    this.chartOptions.labels = this.trendData.members.map(member => member.name || 'Unknown');
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

  // --- Chart Config ---

  getDefaultChartOptions(): ChartOptions {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDark ? '#ffffff' : '#333333';

    return {
      series: [],
      chart: { type: 'donut', height: 320, background: 'transparent' },
      labels: [],
      colors: [
        '#3b82f6', // Blue
        '#64748b', // Slate
        '#10b981', // Emerald
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
      ],
      dataLabels:
      {
        enabled: true,
        formatter: (val: any) => {
          return val.toFixed(0) + '%'; // Shows "25%" instead of "25.0000%"
        },
        style: {
          fontSize: '12px',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: '600',
          colors: ['#fff'] // White text usually looks best on colored slices
        },
        dropShadow: { enabled: false }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '55%',
            labels: {
              show: true,
              name: { color: textColor, fontSize: '14px', fontFamily: 'Poppins, sans-serif' },
              value: {
                color: textColor, fontSize: '20px', fontWeight: 700, fontFamily: 'Poppins, sans-serif',
                formatter: (val: string) => `₹${Number(val).toLocaleString()}`
              },
              total: {
                show: true, showAlways: true, label: 'Total', color: textColor, fontSize: '14px', fontWeight: 600,
                // FIX 1: Explicitly type 'w' as any
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
        // FIX 2: Cast markers to any to bypass strict type check for 'radius'
        markers: { radius: 12 } as any
      },
      responsive: [{ breakpoint: 480, options: { chart: { height: 280 } } }]
    };
  }

  setupColorSchemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const color = e.matches ? '#ffffff' : '#333333';
      this.updateChartColors(color);
    });
  }

  updateChartColors(textColor: string) {
    // We create a NEW object but explicitly preserve the structural settings
    // This prevents the "thin/small" bug
    this.chartOptions = {
      ...this.chartOptions,

      // 1. Force Height Again
      chart: {
        ...this.chartOptions.chart,
        height: 320,
        background: 'transparent'
      },

      // 2. Update Colors
      dataLabels: {
        ...this.chartOptions.dataLabels,
        style: { ...this.chartOptions.dataLabels.style, colors: ['#fff'] } // Keep text white inside slices
      },

      // 3. Force Donut Size & Update Text Colors
      plotOptions: {
        pie: {
          donut: {
            size: '55%', // <--- CRITICAL: Prevents it from becoming thin
            labels: {
              show: true,
              name: {
                color: textColor,
                fontSize: '12px',
                fontFamily: 'Poppins, sans-serif'
              },
              value: {
                color: textColor,
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: 'Poppins, sans-serif',
                formatter: (val: string) => `₹${Number(val).toLocaleString()}`
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total',
                color: textColor,
                fontSize: '12px',
                fontWeight: 600,
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
        ...this.chartOptions.legend,
        labels: { colors: textColor }
      }
    };

    // 4. Force a lightweight update without full re-render if possible
    // (Angular change detection will handle the rest)
  }

  hasData(): boolean {
    // Check if trendData exists and if the total is greater than 0
    if (!this.trendData || !this.trendData.members) return false;
    const total = this.trendData.members.reduce((sum, member) => sum + (member.monthlyExpenses[0] || 0), 0);
    return total > 0;
  }
}