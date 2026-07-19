import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { RedirectGuard } from './core/guards/redirect-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'charts',
    loadChildren: () => import('./charts/charts.module').then(m => m.ChartsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/login/login.module').then(m => m.LoginPageModule),
    canActivate: [RedirectGuard]   // 👈 Added
  },
  {
    path: 'registration',
    loadChildren: () => import('./features/auth/registration/registration.module').then(m => m.RegistrationPageModule),
    canActivate: [RedirectGuard]   // 👈 Added
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./features/auth/forgot-password/forgot-password-module').then(m => m.ForgotPasswordModule),
    canActivate: [RedirectGuard]   // 👈 Added
  },
  {
    path: 'reset/reset-password',
    redirectTo: 'reset-password',
    pathMatch: 'full'
  },
  {
    path: 'reset-password',
    loadChildren: () => import('./features/auth/reset-password/reset-password.module').then(m => m.ResetPasswordPageModule),
    canActivate: [RedirectGuard]   // 👈 Optional: depends on your flow
  }
];


@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
