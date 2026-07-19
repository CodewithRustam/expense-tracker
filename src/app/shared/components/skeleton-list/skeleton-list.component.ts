import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-list',
  standalone: false,
  template: `
    <ion-list class="skeleton-list">
      <ion-item *ngFor="let item of skeletonArray; let i = index" lines="none" class="skeleton-item">
        <ion-avatar slot="start">
          <ion-skeleton-text animated></ion-skeleton-text>
        </ion-avatar>
        <ion-label>
          <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
          <p>
            <ion-skeleton-text animated style="width: 40%"></ion-skeleton-text>
          </p>
        </ion-label>
        <ion-skeleton-text slot="end" animated style="width: 15%; height: 20px;"></ion-skeleton-text>
      </ion-item>
    </ion-list>
  `,
  styleUrls: ['./skeleton-list.component.css']
})
export class SkeletonListComponent {
  @Input() count: number = 5;

  get skeletonArray() {
    return Array(this.count);
  }
}
