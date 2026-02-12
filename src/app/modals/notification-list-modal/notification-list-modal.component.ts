import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppNotification } from 'src/app/models/app-notification';
import { NotificationService } from 'src/app/services/notification-service';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list-modal.component.html',
  styleUrls: ['./notification-list-modal.component.scss'],
  standalone: false
})
export class NotificationListModal implements OnInit {
  notifications: AppNotification[] = [];
  loading = true;
  private isSwiping = false;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private notificationService: NotificationService
  ) { }

  async ngOnInit() {
    await this.loadNotifications();
  }

  async loadNotifications() {
    this.loading = true;
    this.notificationService.getAll().subscribe({
      next: (res) => {
        this.notifications = res;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  async onDrag(event: any) {
    if (!this.isSwiping && Math.abs(event.detail.ratio) > 0.1) {
      this.isSwiping = true;
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    if (event.detail.ratio === 0) this.isSwiping = false;
  }

  async deleteNotification(notif: AppNotification, slidingItem: any) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    slidingItem.close();

    setTimeout(() => {
      const backup = [...this.notifications];
      this.notifications = this.notifications.filter(n => n.id !== notif.id);

      this.notificationService.deleteNotification(notif.id).subscribe({
        error: () => this.notifications = backup
      });
    }, 250);
  }
  cleanBody(body: string) {
    const rupeeFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(0).replace('0', ''); 
    return body.replace(/[₹\?]/g, rupeeFormatter);
  }
  async markAllAsRead() {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      }
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }
}