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
  @Input() currentUserId: number | undefined;
  @Input() groupedExpensesMap: { [key: string]: any[] } = {};

  @Output() onEditExpense = new EventEmitter<any>();
  @Output() onDeleteExpense = new EventEmitter<{ expense: any, slidingItem: any }>();

  getCategoryBadgeClass(category: string | undefined): string {
    const c = category?.toLowerCase() || '';
    if (c.includes('veg')) return 'badge-veg';
    if (c.includes('util') || c.includes('bill') || c.includes('power') || c.includes('electric')) return 'badge-utility';
    if (c.includes('dairy') || c.includes('milk')) return 'badge-dairy';
    if (c.includes('cook') || c.includes('essential') || c.includes('masala')) return 'badge-cook';
    if (c.includes('misc') || c.includes('other')) return 'badge-misc';
    return 'badge-default';
  }

  getIconColor(iconName: string | undefined): string {
    if (!iconName) return '#666';
    const iconMap: any = { 
      'fa-solid fa-leaf': '#27ae60', 
      'fa-solid fa-drumstick-bite': '#e74c3c', 
      'fa-solid fa-burn': '#f1c40f' 
    };
    return iconMap[iconName] || '#666';
  }

  hasExpenses(): boolean {
    if (this.selectedUser === undefined) return false;
    const list = this.groupedExpensesMap[this.selectedUser];
    return !!(list && list.length);
  }

  editExpense(expense: any, slidingItem: any) {
    if (slidingItem) {
      slidingItem.close();
    }
    this.onEditExpense.emit(expense);
  }

  deleteExpense(expense: any, slidingItem: any) {
    this.onDeleteExpense.emit({ expense, slidingItem });
  }
}
