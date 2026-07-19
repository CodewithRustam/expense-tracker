import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: false,
  template: `
    <div class="empty-container">
      <div class="empty-circle">
        <ion-icon [name]="iconName"></ion-icon>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message">{{ message }}</p>
    </div>
  `,
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
  @Input() iconName: string = 'wallet-outline';
  @Input() title: string = 'No data';
  @Input() message: string = 'Nothing to show here';
}
