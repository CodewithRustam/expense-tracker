import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-list',
  standalone: false,
  template: `
    <div class="group-list">
      <div class="group-row skeleton-card" *ngFor="let item of skeletonArray; let i = index" style="animation: none;">
        <div class="card-icon-wrapper" style="background: var(--surface-sunken); border: none;">
          <ion-skeleton-text animated style="width: 100%; height: 100%; margin: 0; border-radius: 12px;"></ion-skeleton-text>
        </div>

        <div class="text-group">
          <ion-skeleton-text animated style="width: 60%; height: 16px; margin-bottom: 6px; border-radius: 4px;"></ion-skeleton-text>
          <div class="group-meta">
            <ion-skeleton-text animated style="width: 40%; height: 12px; border-radius: 4px;"></ion-skeleton-text>
          </div>
        </div>

        <div class="card-amount">
          <ion-skeleton-text animated style="width: 50px; height: 18px; border-radius: 4px;"></ion-skeleton-text>
        </div>

        <ion-skeleton-text animated style="width: 16px; height: 16px; border-radius: 50%; margin-left: 12px;"></ion-skeleton-text>
      </div>
    </div>
  `,
  styleUrls: ['./skeleton-list.component.css']
})
export class SkeletonListComponent {
  @Input() count: number = 5;

  get skeletonArray() {
    return Array(this.count);
  }
}
