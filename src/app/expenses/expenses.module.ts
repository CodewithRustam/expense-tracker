import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ExpensesPageRoutingModule } from './expenses-routing.module';

import { ExpensesPage } from './expenses.page';

// Pipes
import { InitialsPipe } from '../shared/pipes/initials.pipe';
import { FirstNamePipe } from '../shared/pipes/first-name.pipe';

// Sub-components
import { ExpenseStatsComponent } from '../features/expense-dashboard/components/expense-stats/expense-stats.component';
import { MemberListComponent } from '../features/expense-dashboard/components/member-list/member-list.component';
import { PersonalCardComponent } from '../features/expense-dashboard/components/personal-card/personal-card.component';
import { TransactionLedgerComponent } from '../features/expense-dashboard/components/transaction-ledger/transaction-ledger.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExpensesPageRoutingModule
  ],
  declarations: [
    ExpensesPage,
    InitialsPipe,
    FirstNamePipe,
    ExpenseStatsComponent,
    MemberListComponent,
    PersonalCardComponent,
    TransactionLedgerComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ExpensesPageModule {}
