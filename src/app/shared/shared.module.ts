import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { SkeletonListComponent } from './components/skeleton-list/skeleton-list.component';
import { UserHeaderComponent } from './components/user-header/user-header.component';

@NgModule({
  declarations: [
    EmptyStateComponent,
    SkeletonListComponent,
    UserHeaderComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    EmptyStateComponent,
    SkeletonListComponent,
    UserHeaderComponent
  ]
})
export class SharedModule { }
