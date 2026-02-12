import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs'; // Added BehaviorSubject and tap
import { AppNotification } from '../models/app-notification';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'https://financetracker.runasp.net/api/notifications';

  // 1. The Global "State" for unread count
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  // 2. Helper to update the stream
  updateUnreadCount(count: number) {
    this.unreadCountSubject.next(count);
  }

  registerPushToken(deviceToken: string): Observable<any> {
    const payload = { deviceToken };
    return this.http.post(`${this.baseUrl}/app-register`, payload);
  }

  // 3. Automatically updates count when fetching
  getAll(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.baseUrl}/get-notifications`).pipe(
      tap(notifications => {
        const count = notifications.filter(n => !n.isRead).length;
        this.updateUnreadCount(count);
      })
    );
  }

  // 4. Reset count to 0 immediately on success
  markAllAsRead() {
    const userid = this.authService.getUserId();
    return this.http.put(`${this.baseUrl}/mark-all-read?userId=${userid}`, {}).pipe(
      tap(() => this.updateUnreadCount(0))
    );
  }

  // 5. Reset count to 0 immediately on clear
  clearAll() {
    const userId = this.authService.getUserId();
    return this.http.delete(`${this.baseUrl}/clear-all?userId=${userId}`).pipe(
      tap(() => this.updateUnreadCount(0))
    );
  }

  deleteNotification(id: number) {
    const url = `${this.baseUrl}/delete-notification?notificationId=${id}`;
    return this.http.delete(url).pipe(
      tap(() => {
        // Decrease count by 1 locally so the UI updates instantly
        const current = this.unreadCountSubject.value;
        if (current > 0) this.updateUnreadCount(current - 1);
      })
    );
  }

  addNotification(roomId: number, title?: string, body?: string) {
    const payload = { RoomId: roomId, Title: title, Body: body };
    return this.http.post(`${this.baseUrl}/send`, payload).subscribe({
      next: (res) => console.log('✅ Notification Sent:', res),
      error: (err) => console.error('❌ Error sending notification:', err),
    });
  }
}