import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-transaction-ledger',
  templateUrl: './transaction-ledger.component.html',
  standalone: false
})
export class TransactionLedgerComponent {
  @Input() isLoadingExpenses = false;
  @Input() users: any[] = [];
  @Input() selectedUser: number | undefined;
  @Input() currentUserId!: string;
  @Input() groupedExpensesMap: { [key: string]: any[] } = {};

  @Output() onEditExpense = new EventEmitter<any>();
  @Output() onDeleteExpense = new EventEmitter<{ expense: any, slidingItem: any }>();

  searchQuery: string = '';
  selectedCategoryFilter: string = 'all';

  readonly categoryFilters = [
    { id: 'all', label: 'All', icon: 'fa-solid fa-layer-group' },
    { id: 'veg', label: 'Veg & Grocery', icon: 'fa-solid fa-leaf' },
    { id: 'cook', label: 'Cooking & Food', icon: 'fa-solid fa-utensils' },
    { id: 'dairy', label: 'Dairy & Milk', icon: 'fa-solid fa-glass-water' },
    { id: 'utility', label: 'Bills & Utilities', icon: 'fa-solid fa-bolt' },
    { id: 'misc', label: 'Other', icon: 'fa-solid fa-receipt' }
  ];

  getCategoryBadgeClass(category: string | undefined): string {
    const c = category?.toLowerCase() || '';
    if (c.includes('veg')) return 'badge-veg';
    if (c.includes('util') || c.includes('bill') || c.includes('power') || c.includes('electric')) return 'badge-utility';
    if (c.includes('dairy') || c.includes('milk') || c.includes('curd')) return 'badge-dairy';
    if (c.includes('cook') || c.includes('essential') || c.includes('masala') || c.includes('grain') || c.includes('rice') || c.includes('food') || c.includes('meat') || c.includes('chicken') || c.includes('gosht')) return 'badge-cook';
    if (c.includes('misc') || c.includes('other')) return 'badge-misc';
    return 'badge-default';
  }

  getCategoryIcon(category: string | undefined, defaultIcon?: string): string {
    if (defaultIcon && defaultIcon.trim().length > 0) return defaultIcon;
    const c = category?.toLowerCase() || '';
    if (c.includes('veg')) return 'fa-solid fa-leaf';
    if (c.includes('util') || c.includes('bill') || c.includes('power') || c.includes('electric')) return 'fa-solid fa-bolt';
    if (c.includes('dairy') || c.includes('milk') || c.includes('curd')) return 'fa-solid fa-glass-water';
    if (c.includes('cook') || c.includes('essential') || c.includes('masala') || c.includes('food') || c.includes('grain') || c.includes('rice') || c.includes('meat') || c.includes('chicken') || c.includes('gosht')) return 'fa-solid fa-utensils';
    if (c.includes('travel')) return 'fa-solid fa-plane';
    return 'fa-solid fa-receipt';
  }

  getCategoryGradientClass(category: string | undefined): string {
    const c = category?.toLowerCase() || '';
    if (c.includes('veg')) return 'cat-grad-veg';
    if (c.includes('util') || c.includes('bill') || c.includes('power') || c.includes('electric')) return 'cat-grad-util';
    if (c.includes('dairy') || c.includes('milk') || c.includes('curd')) return 'cat-grad-dairy';
    if (c.includes('cook') || c.includes('essential') || c.includes('masala') || c.includes('food') || c.includes('grain') || c.includes('rice') || c.includes('meat') || c.includes('chicken') || c.includes('gosht')) return 'cat-grad-cook';
    if (c.includes('travel')) return 'cat-grad-travel';
    return 'cat-grad-misc';
  }

  getIconColor(iconName: string | undefined): string {
    if (!iconName) return 'var(--accent)';
    const iconMap: any = {
      'fa-solid fa-leaf': '#10b981',
      'fa-solid fa-drumstick-bite': '#f43f5e',
      'fa-solid fa-burn': '#f59e0b',
      'fa-solid fa-utensils': '#f59e0b',
      'fa-solid fa-bolt': '#0ea5e9',
      'fa-solid fa-glass-water': '#8b5cf6',
      'fa-solid fa-receipt': '#ec4899'
    };
    return iconMap[iconName] || 'var(--accent)';
  }

  get isCurrentSelectedUserSettled(): boolean {
    if (!this.users || this.selectedUser === undefined) return false;
    const user = this.users.find(u => u.memberId === this.selectedUser);
    return user?.badgeText === 'Settled up';
  }

  hasExpenses(): boolean {
    if (this.selectedUser === undefined) return false;
    const list = this.groupedExpensesMap[this.selectedUser];
    return !!(list && list.length);
  }

  getFilteredGroups(): any[] {
    if (this.selectedUser === undefined) return [];
    const list = this.groupedExpensesMap[this.selectedUser];
    if (!list || !list.length) return [];

    const query = this.searchQuery.trim().toLowerCase();
    const cat = this.selectedCategoryFilter;

    if (!query && cat === 'all') {
      return list;
    }

    return list
      .map(group => {
        const filteredExpenses = (group.expenses || []).filter((exp: any) => {
          const matchesQuery = !query ||
            (exp.item && exp.item.toLowerCase().includes(query)) ||
            (exp.category && exp.category.toLowerCase().includes(query));

          let matchesCat = true;
          if (cat !== 'all') {
            const expCat = (exp.category || '').toLowerCase();
            if (cat === 'veg') matchesCat = expCat.includes('veg');
            else if (cat === 'utility') matchesCat = expCat.includes('util') || expCat.includes('bill') || expCat.includes('power') || expCat.includes('electric');
            else if (cat === 'dairy') matchesCat = expCat.includes('dairy') || expCat.includes('milk');
            else if (cat === 'cook') matchesCat = expCat.includes('cook') || expCat.includes('essential') || expCat.includes('masala') || expCat.includes('food');
            else if (cat === 'misc') matchesCat = expCat.includes('misc') || expCat.includes('other');
          }

          return matchesQuery && matchesCat;
        });

        const totalDayAmount = filteredExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

        return {
          ...group,
          expenses: filteredExpenses,
          totalDayAmount,
          expenseCount: filteredExpenses.length
        };
      })
      .filter(group => group.expenses && group.expenses.length > 0);
  }

  totalFilteredCount(): number {
    const groups = this.getFilteredGroups();
    return groups.reduce((count, g) => count + (g.expenses?.length || 0), 0);
  }

  setCategoryFilter(catId: string) {
    this.selectedCategoryFilter = catId;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  async editExpense(expense: any, slidingItem: any) {
    if (slidingItem) {
      await slidingItem.close();
    }
    this.onEditExpense.emit(expense);
  }

  deleteExpense(expense: any, slidingItem: any) {
    this.onDeleteExpense.emit({ expense, slidingItem });
  }
}
