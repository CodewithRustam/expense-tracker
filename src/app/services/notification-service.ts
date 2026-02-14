import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs'; // Added Subject
import { tap, map } from 'rxjs/operators';
import { AppNotification } from '../models/app-notification';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private baseUrl = 'https://financetracker.runasp.net/api/notifications';

  // ✅ Global Refresh Stream (The missing part)
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  // ✅ Global unread count state
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // ================================
  // Helper Methods
  // ================================

  private get userId(): string {
    return this.authService.getUserId()!;
  }

  // ✅ Trigger a refresh across the app
  public triggerRefresh(): void {
    this.refreshSubject.next();
  }

  private setUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  private decreaseUnreadCount(): void {
    const current = this.unreadCountSubject.value;
    if (current > 0) {
      this.unreadCountSubject.next(current - 1);
    }
  }

  // ================================
  // API Methods
  // ================================

  registerPushToken(deviceToken: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/app-register`, { deviceToken });
  }

  getAll(): Observable<AppNotification[]> {
    return this.http
      .get<AppNotification[]>(`${this.baseUrl}/get-notifications`)
      .pipe(
        tap(notifications => {
          const unread = notifications.filter(n => !n.isRead).length;
          this.setUnreadCount(unread);
        })
      );
  }

  markAllAsRead(): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/mark-all-read?userId=${this.userId}`, {})
      .pipe(
        tap(() => {
          this.setUnreadCount(0);
          this.triggerRefresh(); // ✅ Notify listeners
        })
      );
  }

  clearAll(): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/clear-all?userId=${this.userId}`)
      .pipe(
        tap(() => {
          this.setUnreadCount(0);
          this.triggerRefresh(); // ✅ Notify listeners
        })
      );
  }

  deleteNotification(id: number): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/delete-notification?notificationId=${id}`)
      .pipe(
        tap(() => {
          this.decreaseUnreadCount();
          this.triggerRefresh(); // ✅ Notify listeners
        })
      );
  }

  addNotification(roomId: number, title?: string, body?: string): Observable<any> {
    const payload = {
      RoomId: roomId,
      Title: title,
      Body: body
    };

    return this.http.post(`${this.baseUrl}/send`, payload).pipe(
      tap(() => this.triggerRefresh()) // ✅ Refresh when new notification is sent
    );
  }
}