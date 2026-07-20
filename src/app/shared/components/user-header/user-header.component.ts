import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-user-header',
  standalone: false,
  template: `
    <!-- We removed the wrapper div because this component sits inside .top-nav -->
    <div class="user-section" (click)="onAvatarClick()">
      <div class="avatar-container">
        <ion-avatar>
          <img *ngIf="avatarUrl; else initialsTpl" [src]="avatarUrl" alt="Avatar">
          <ng-template #initialsTpl>
            <div class="initials-avatar">{{ initials }}</div>
          </ng-template>
        </ion-avatar>
      </div>
      <div class="greeting-text">
        <span class="greeting-label">{{ subtitle }}</span>
        <h2 class="user-name">{{ title }}</h2>
      </div>
    </div>
    
    <div class="actions-group" style="display: flex; gap: 10px;">
      <button class="action-icon" (click)="onAddGroupClick()" aria-label="Add Group">
        <ion-icon name="add-circle-outline"></ion-icon>
      </button>
      <button class="action-icon" (click)="onNotificationClick()" aria-label="Notifications">
        <ion-icon name="notifications-outline"></ion-icon>
        <span class="notification-badge" *ngIf="unreadCount > 0">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>
    </div>
  `,
  styleUrls: ['./user-header.component.css']
})
export class UserHeaderComponent {
  @Input() title: string = 'User';
  @Input() subtitle: string = 'Welcome back,';
  @Input() unreadCount: number = 0;
  @Input() initials: string = 'U';
  @Input() avatarUrl?: string;

  @Output() avatarClick = new EventEmitter<void>();
  @Output() notificationClick = new EventEmitter<void>();
  @Output() addGroupClick = new EventEmitter<void>();

  onAvatarClick() {
    this.avatarClick.emit();
  }

  onNotificationClick() {
    this.notificationClick.emit();
  }

  onAddGroupClick() {
    this.addGroupClick.emit();
  }
}
