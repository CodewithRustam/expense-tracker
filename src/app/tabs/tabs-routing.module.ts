import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('../features/dashboard/home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'expenses',
        loadChildren: () =>
          import('../expenses/expenses.module').then(m => m.ExpensesPageModule)
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('../features/profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: 'history',
        loadChildren: () =>
          import('../features/history/history.module').then(m => m.HistoryPageModule)
      },
      {
        path: 'charts',
        loadChildren: () =>
          import('../charts/charts.module').then(m => m.ChartsPageModule)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule { }
