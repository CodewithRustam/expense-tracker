import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, signal, computed, inject, effect, untracked } from '@angular/core';
import { ExpenseService } from '../core/services/expense';
import { MonthlyExpensesTrendResponse } from '../core/models/Expense/MonthlyExpensesTrendResponse';
import { CategoryExpenses } from '../core/models/Expense/CategoryExpenses';
import { TopSpend } from '../core/models/Expense/TopSpend';
import { GroupService } from '../core/services/group';
import { Subject, Subscription, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DonutChartOptions, getDonutChartOptions } from '../core/utils/chart.config';

@Component({
  selector: 'app-charts',
  templateUrl: './charts.page.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartsPage implements OnInit, OnDestroy {
  private expenseService = inject(ExpenseService);
  private groupService = inject(GroupService);

  trendData = signal<MonthlyExpensesTrendResponse>({
    months: [],
    members: [],
    categoryExpenses: [],
    topSpends: []
  });

  groups = signal<any[]>([]);
  selectedGroup = signal<any>(null);
  currentMonth = signal<string>(this.getCurrentMonth());
  activeTab = signal<'categories' | 'topSpends'>('categories');
  isLoading = signal<boolean>(true);

  chartOptions = signal<DonutChartOptions>(getDonutChartOptions(window.matchMedia('(prefers-color-scheme: dark)').matches));

  currentMonthLabel = computed(() => this.formatMonthLabel(this.currentMonth()));
  hasData = computed(() => this.trendData().members?.some(m => (m.monthlyExpenses[0] || 0) > 0));

  private destroy$ = new Subject<void>();
  private refreshSub: Subscription | undefined;
  private colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  private colorSchemeHandler = (e: MediaQueryListEvent) => this.applyTextColor(e.matches);

  constructor() {}

  ngOnInit() {
    this.refreshSub = merge(
      this.expenseService.refresh$,
      this.groupService.refresh$
    ).pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadChartData(true);
      });

    this.colorSchemeMedia.addEventListener('change', this.colorSchemeHandler);
    this.loadChartData();
  }

  public renderChart = signal<boolean>(false);
  public playHeaderAnim = signal<boolean>(false);

  ionViewWillEnter() {
    this.playHeaderAnim.set(false);
    setTimeout(() => this.playHeaderAnim.set(true), 10);
  }

  ionViewDidEnter() {
    if (this.hasData()) {
      // Delay slightly to ensure transition is fully done before drawing
      setTimeout(() => this.renderChart.set(true), 50);
    }
  }

  ionViewWillLeave() {
    this.renderChart.set(false);
  }

  applyChartData() {
    const data = this.trendData();
    const currentOpts = this.chartOptions();
    this.chartOptions.set({
      ...currentOpts,
      series: data.members.map(member => member.monthlyExpenses[0] || 0),
      labels: data.members.map(member => member.name || 'Unknown')
    });
    this.renderChart.set(true);
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshSub?.unsubscribe();
    this.colorSchemeMedia.removeEventListener('change', this.colorSchemeHandler);
  }

  loadChartData(isBackground = false) {
    if (!isBackground) this.isLoading.set(true);

    this.groupService.getGroups().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res.data;
        const success = Array.isArray(res) ? true : res.success;

        if (success && data?.length > 0) {
          this.groups.set(data);

          const currentSelected = this.selectedGroup();
          if (!currentSelected) {
            this.selectedGroup.set(data[0]);
          } else {
            this.selectedGroup.set(data.find((g: any) => g.roomId === currentSelected.roomId) || data[0]);
          }

          this.loadExpenseTrend(isBackground);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  onGroupChange(event: any) {
    this.selectedGroup.set(event.detail.value);
    this.loadExpenseTrend();
  }

  loadExpenseTrend(isBackground = false) {
    const currentGroup = this.selectedGroup();
    if (!currentGroup) return;
    if (!isBackground) this.isLoading.set(true);

    this.expenseService.getMonthlyExpensesTrend(currentGroup.roomId, this.currentMonth())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.trendData.set(data);
          this.applyChartData();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Trend API Error:', err);
          this.isLoading.set(false);
        }
      });
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private formatMonthLabel(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(year, monthNum - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  previousMonth() {
    const [year, monthNum] = this.currentMonth().split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    date.setMonth(date.getMonth() - 1);
    this.currentMonth.set(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    this.loadExpenseTrend();
  }

  nextMonth() {
    if (!this.canNavigateNext()) return;
    const [year, monthNum] = this.currentMonth().split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    date.setMonth(date.getMonth() + 1);
    this.currentMonth.set(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    this.loadExpenseTrend();
  }

  canNavigateNext(): boolean {
    const [year, month] = this.currentMonth().split('-').map(Number);
    const now = new Date();
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  }

  switchTab(value: 'categories' | 'topSpends') {
    this.activeTab.set(value);
  }

  getCategoryTotal(category: CategoryExpenses): number {
    return category.monthlyTotals[0] || 0;
  }

  getTopSpendTotal(topSpend: TopSpend): number {
    return topSpend.monthlyTotals[0] || 0;
  }

  getMonthlyTotal(): number {
    return this.trendData().members.reduce((total, member) => total + (member.monthlyExpenses[0] || 0), 0);
  }

  getLatestDate(monthlyTotals: number[]): Date {
    const [year, month] = this.currentMonth().split('-').map(Number);
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

  private applyTextColor(isDark: boolean) {
    const color = isDark ? '#f2f2f7' : '#17172b';
    this.chartOptions.update(opts => ({
      ...opts,
      plotOptions: {
        ...opts.plotOptions,
        pie: {
          ...opts.plotOptions?.pie,
          donut: {
            ...opts.plotOptions?.pie?.donut,
            labels: {
              ...opts.plotOptions?.pie?.donut?.labels,
              name: { ...opts.plotOptions?.pie?.donut?.labels?.name, color },
              value: { ...opts.plotOptions?.pie?.donut?.labels?.value, color },
              total: { ...opts.plotOptions?.pie?.donut?.labels?.total, color }
            }
          }
        }
      },
      legend: { ...opts.legend, labels: { colors: color } }
    }));
  }
}