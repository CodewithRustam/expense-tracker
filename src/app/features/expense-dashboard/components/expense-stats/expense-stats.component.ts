import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-expense-stats',
  templateUrl: './expense-stats.component.html',
  standalone: false
})
export class ExpenseStatsComponent {
  @Input() isLoadingExpenses = false;
  @Input() totalAllTime = 0;
  @Input() averageAmount = 0;
}
