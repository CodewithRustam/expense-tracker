import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { NotificationService } from 'src/app/core/services/notification-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list-modal.component.html',
  standalone: false
})
export class NotificationListModal implements OnInit, OnDestroy {

  notifications: any[] = [];
  loading = true;
  isClearing = false;
  private refreshSub?: Subscription;

  get hasUnread(): boolean {
    return this.notifications && this.notifications.some(n => !n.isRead);
  }

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
        console.log('🔔 Notifications response:', res);
        this.notifications = res.sort((a: any, b: any) => {
          const dateB = new Date(b.receivedAt || b.sentAt || 0).getTime();
          const dateA = new Date(a.receivedAt || a.sentAt || 0).getTime();
          return dateB - dateA;
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading notifications:', err);
        this.loading = false;
      }
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

  getCategoryClass(text: string | undefined | null): string {
    const t = text?.toLowerCase() || '';
    if (t.includes('settle') || t.includes('payment') || t.includes('paid') || t.includes('received')) return 'settle-tag';
    if (t.includes('expense') || t.includes('spent') || t.includes('added') || t.includes('updated')) return 'expense-tag';
    return 'alert-tag';
  }

  getCategoryIcon(text: string | undefined | null): string {
    const t = text?.toLowerCase() || '';
    if (t.includes('settle') || t.includes('payment') || t.includes('paid') || t.includes('received')) return 'cash-outline';
    if (t.includes('expense') || t.includes('spent') || t.includes('added') || t.includes('updated')) return 'receipt-outline';
    return 'notifications-outline';
  }

  async markAllAsRead() {
    const unreadList = this.notifications.filter(n => !n.isRead);
    if (unreadList.length === 0) return;

    try {
      await this.notificationService.markAllAsRead().toPromise();
      this.notifications.forEach(n => n.isRead = true);
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
      console.error('Mark all read failed', err);
    }
  }

  cleanBody(body: string) {
    return body ? body.replace(/[?]/g, '₹') : '';
  }

  formatTimestamp(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    } else {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${date.toLocaleDateString([], options)}, ${timeStr}`;
    }
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
