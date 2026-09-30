import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener, ViewChildren, QueryList, inject } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-transaction-ledger',
  templateUrl: './transaction-ledger.component.html',
  standalone: false
})
export class TransactionLedgerComponent implements OnInit, OnDestroy {
  @Input() isLoadingExpenses = false;
  @Input() users: any[] = [];
  @Input() selectedUser: number | undefined;
  @Input() currentUserId!: string;
  @Input() isRoomCreator: boolean = false;
  @Input() groupedExpensesMap: { [key: string]: any[] } = {};

  private ionContent = inject(IonContent, { optional: true });
  private scrollSub?: Subscription;

  @Output() onEditExpense = new EventEmitter<any>();
  @Output() onDeleteExpense = new EventEmitter<{ expense: any, slidingItem: any }>();

  canEdit(exp: any): boolean {
    if (this.isCurrentSelectedUserSettled) return false;
    return !!exp?.isEditShow;
  }

  canDelete(exp: any): boolean {
    if (this.isCurrentSelectedUserSettled) return false;
    return !!exp?.isEditShow;
  }

  canSlide(exp: any): boolean {
    return this.canEdit(exp) && this.canDelete(exp);
  }

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

  @ViewChildren('slidingItem') slidingItems!: QueryList<any>;

  private lastDragTimestamp = 0;
  private activeSlidingItem: any = null;
  private autoCloseTimer: any = null;
  private hasTriggeredHaptic = false;

  ngOnInit() {
    if (this.ionContent?.ionScroll) {
      this.scrollSub = this.ionContent.ionScroll.subscribe(() => {
        this.closeAllSliding();
      });
    }
  }

  ngOnDestroy() {
    this.scrollSub?.unsubscribe();
    this.clearAutoCloseTimer();
  }

  setCategoryFilter(catId: string) {
    this.closeAllSliding();
    this.selectedCategoryFilter = catId;
  }

  clearSearch() {
    this.closeAllSliding();
    this.searchQuery = '';
  }

  private clearAutoCloseTimer() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }

  public closeAllSliding() {
    this.clearAutoCloseTimer();
    if (this.activeSlidingItem) {
      try {
        this.activeSlidingItem.close();
      } catch {}
      this.activeSlidingItem = null;
    }
    if (this.slidingItems) {
      this.slidingItems.forEach(item => {
        try {
          item.close();
        } catch {}
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.activeSlidingItem) return;
    if (Date.now() - this.lastDragTimestamp < 350) return;
    const target = event?.target as HTMLElement;
    if (target && !target.closest('.tl-slide-item')) {
      this.closeAllSliding();
    }
  }

  onSlidingDrag(slidingItem: any, exp: any, event?: any) {
    this.lastDragTimestamp = Date.now();
    this.activeSlidingItem = slidingItem;
    this.clearAutoCloseTimer();

    const amount = event?.detail?.amount || 0;
    const ratio = event?.detail?.ratio || 0;

    // Auto-collapse split breakdown if open so layout stays aligned during swipe
    if (Math.abs(amount) > 15 || Math.abs(ratio) > 0.1) {
      if (exp?.expenseId !== undefined && this.expandedExpenseIds.has(exp.expenseId)) {
        this.expandedExpenseIds.delete(exp.expenseId);
      }
    }

    // Subtle tactile haptic tick when passing activation threshold
    if (Math.abs(amount) > 60 || Math.abs(ratio) > 0.5) {
      if (!this.hasTriggeredHaptic) {
        this.hasTriggeredHaptic = true;
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    } else {
      this.hasTriggeredHaptic = false;
    }
  }

  onSlidingEnd(slidingItem: any) {
    this.hasTriggeredHaptic = false;
    this.clearAutoCloseTimer();

    // After gesture completes, check if the card is resting open
    setTimeout(async () => {
      try {
        const amount = await slidingItem.getOpenAmount();
        if (Math.abs(amount) > 20) {
          this.activeSlidingItem = slidingItem;
          // Card is open at rest. If the user leaves it without tapping, auto-return to normal after 3s
          this.clearAutoCloseTimer();
          this.autoCloseTimer = setTimeout(async () => {
            try {
              await slidingItem.close();
            } catch {}
            if (this.activeSlidingItem === slidingItem) {
              this.activeSlidingItem = null;
            }
          }, 3000);
        }
      } catch {}
    }, 150);
  }

  async editExpense(expense: any, slidingItem: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (slidingItem) {
      try {
        await slidingItem.close();
      } catch {}
    }
    this.activeSlidingItem = null;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}
    this.onEditExpense.emit(expense);
  }

  async deleteExpense(expense: any, slidingItem: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.activeSlidingItem = null;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}
    this.onDeleteExpense.emit({ expense, slidingItem });
  }

  // --- Shared With & Breakdown Helpers ---
  expandedExpenseIds = new Set<number>();

  getMemberName(memberId: number): string {
    const u = this.users?.find(user => user.memberId === memberId);
    return u?.memberName || u?.name || `Member ${memberId}`;
  }

  get currentMember(): any | undefined {
    if (!this.users || !this.users.length) return undefined;
    const bySettle = this.users.find(u => u.isSettleShow);
    if (bySettle) return bySettle;
    if (this.currentUserId) {
      return this.users.find(u => u.applicationUserId === this.currentUserId || u.memberId === this.currentUserId);
    }
    return undefined;
  }

  get isUserInRoom(): boolean {
    return !!this.currentMember;
  }

  isCurrentUser(memberId: number): boolean {
    const current = this.currentMember;
    return current ? current.memberId === memberId : false;
  }

  getExpenseParticipants(exp: any): { memberId: number; name: string; owedAmount: number }[] {
    if (exp?.splits && exp.splits.length > 0) {
      const validSplits = exp.splits.filter((s: any) => s.owedAmount > 0);
      const list = validSplits.length > 0 ? validSplits : exp.splits;
      return list.map((s: any) => ({
        memberId: s.memberId,
        name: s.memberName || this.getMemberName(s.memberId),
        owedAmount: s.owedAmount ?? (exp.amount / list.length)
      }));
    }

    if (this.users && this.users.length > 0) {
      const splitAmount = Math.round((exp.amount / this.users.length) * 100) / 100;
      return this.users.map(u => ({
        memberId: u.memberId,
        name: u.memberName || u.name,
        owedAmount: splitAmount
      }));
    }

    return [];
  }

  isSharedWithAll(exp: any): boolean {
    const participants = this.getExpenseParticipants(exp);
    const totalRoomMembers = this.users?.length || 0;
    return totalRoomMembers > 0 && participants.length >= totalRoomMembers;
  }

  isSharedWithMultiple(exp: any): boolean {
    return this.getExpenseParticipants(exp).length > 1;
  }

  getSharedWithSummary(exp: any): string {
    const participants = this.getExpenseParticipants(exp);
    if (!participants.length) return 'Everyone';

    const totalRoomMembers = this.users?.length || 0;
    if (totalRoomMembers > 0 && participants.length >= totalRoomMembers) {
      return `All (${participants.length})`;
    }

    if (participants.length === 1) {
      return `${participants[0].name.split(' ')[0]} (Solo)`;
    }

    if (participants.length === 2) {
      return `${participants[0].name.split(' ')[0]}, ${participants[1].name.split(' ')[0]}`;
    }

    const firstTwo = participants.slice(0, 2).map(p => p.name.split(' ')[0]).join(', ');
    const remaining = participants.length - 2;
    return `${firstTwo} +${remaining}`;
  }

  getFullSharedNames(exp: any): string {
    const participants = this.getExpenseParticipants(exp);
    return participants.map(p => p.name).join(', ');
  }

  getUserShare(exp: any): number | null {
    const current = this.currentMember;
    if (!current) return null;
    const participants = this.getExpenseParticipants(exp);
    const mySplit = participants.find(p => p.memberId === current.memberId);
    return mySplit ? mySplit.owedAmount : null;
  }

  getMemberInitial(name: string | undefined): string {
    if (!name || !name.trim()) return '?';
    return name.trim().charAt(0).toUpperCase();
  }

  isExpanded(exp: any): boolean {
    return exp?.expenseId !== undefined && this.expandedExpenseIds.has(exp.expenseId);
  }

  async toggleExpenseDetails(exp: any, slidingItem?: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // Guard 1: Ignore click if a swipe gesture just finished within 350ms (avoids expansion on swipe release)
    if (Date.now() - this.lastDragTimestamp < 350) {
      return;
    }

    // Guard 2: If the sliding item is currently open, tapping it should close it smoothly instead of expanding details
    if (slidingItem) {
      try {
        const openAmount = await slidingItem.getOpenAmount();
        if (openAmount !== 0) {
          await slidingItem.close();
          this.activeSlidingItem = null;
          return;
        }
      } catch {}
    }

    if (!exp || exp.expenseId === undefined) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}

    if (this.expandedExpenseIds.has(exp.expenseId)) {
      this.expandedExpenseIds.delete(exp.expenseId);
    } else {
      // Auto-close any open sliding item before expanding details
      if (this.activeSlidingItem) {
        try {
          await this.activeSlidingItem.close();
        } catch {}
        this.activeSlidingItem = null;
      }
      this.expandedExpenseIds.add(exp.expenseId);
    }
  }
}
