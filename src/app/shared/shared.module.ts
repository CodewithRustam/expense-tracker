import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { SkeletonListComponent } from './components/skeleton-list/skeleton-list.component';
import { UserHeaderComponent } from './components/user-header/user-header.component';
import { AddGroupModalComponent } from './modals/add-group-modal/add-group-modal.component';

@NgModule({
  declarations: [
    EmptyStateComponent,
    SkeletonListComponent,
    UserHeaderComponent,
    AddGroupModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    EmptyStateComponent,
    SkeletonListComponent,
    UserHeaderComponent,
    AddGroupModalComponent
  ]
})
export class SharedModule { }
