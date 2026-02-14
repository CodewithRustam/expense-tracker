import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { NotificationService } from 'src/app/services/notification-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list-modal.component.html',
  styleUrls: ['./notification-list-modal.component.scss'],
  standalone: false
})
export class NotificationListModal implements OnInit, OnDestroy {

  notifications: any[] = [];
  loading = true;
  isClearing = false;
  private refreshSub?: Subscription;

  constructor(
    private modalCtrl: ModalController,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadNotifications();

    // Prevent reload during animation
    this.refreshSub = this.notificationService.refresh$
      .subscribe(() => {
        if (!this.isClearing) {
          this.loadNotifications(true);
        }
      });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadNotifications(isBackground = false) {
    if (!isBackground) this.loading = true;

    this.notificationService.getAll().subscribe({
      next: (res) => {
        this.notifications = res.sort((a: any, b: any) =>
          new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        );
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  // 🧈 BUTTERY SMOOTH CLEAR ALL
  async clearAll() {
    if (this.isClearing || this.notifications.length === 0) return;

    this.isClearing = true;

    try {
      // 1️⃣ Wait for backend delete
      await this.notificationService.clearAll().toPromise();

      // 2️⃣ Smooth top-to-bottom cascade animation
      while (this.notifications.length > 0) {
        const first = this.notifications[0];
        first.collapsing = true;

        await new Promise(r => setTimeout(r, 300));

        this.notifications.shift();
      }


      await Haptics.notification({ type: NotificationType.Success });

    } catch (err) {
      console.error('Clear failed', err);
    }

    this.isClearing = false;
  }

  async onSwipeDelete(notif: any, slidingItem: any) {

    await Haptics.impact({ style: ImpactStyle.Medium });

    await slidingItem.close();

    // Add slight delay before collapse (natural pause)
    await new Promise(r => setTimeout(r, 120));

    notif.collapsing = true;

    // Slower, smoother collapse
    await new Promise(r => setTimeout(r, 450));

    this.notifications = this.notifications.filter(n => n.id !== notif.id);

    this.notificationService.deleteNotification(notif.id).subscribe();
  }


  trackById(index: number, item: any) {
    return item.id;
  }

  cleanBody(body: string) {
    return body ? body.replace(/[?]/g, '₹') : '';
  }

  formatTimestamp(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  onDrag(event: any, notif: any) {

    const ratio = Math.abs(event.detail.ratio || 0);
    const progress = Math.min(ratio, 1);

    const opacity = progress * 0.25; // soft red only
    notif.swipeColor = `rgba(255, 59, 48, ${opacity})`;
  }
  resetColor(notif: any) {
    notif.swipeColor = '';
  }

}
