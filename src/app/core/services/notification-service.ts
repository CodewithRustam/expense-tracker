import { Injectable, signal, WritableSignal } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, Subject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AppNotification } from '../models/app-notification';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // Global Refresh Stream
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  // ✅ Global unread count state using Signal
  public unreadCount: WritableSignal<number> = signal(0);

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) { }

  // ================================
  // Helper Methods
  // ================================

  private get userId(): string {
    return this.authService.getUserId()!;
  }

  // Trigger a refresh across the app
  public triggerRefresh(): void {
    this.refreshSubject.next();
  }

  private setUnreadCount(count: number): void {
    this.unreadCount.set(count);
  }

  private decreaseUnreadCount(): void {
    this.unreadCount.update(count => count > 0 ? count - 1 : 0);
  }

  // ================================
  // API Methods
  // ================================

  registerPushToken(deviceToken: string): Observable<any> {
    return this.apiService.post<any>(`notifications/app-register`, { deviceToken });
  }

  getAll(): Observable<AppNotification[]> {
    return this.apiService
      .get<any>(`notifications/get-notifications`)
      .pipe(
        map(res => {
          return Array.isArray(res) ? res : (res?.data || []);
        }),
        tap((notifications: AppNotification[]) => {
          const unread = notifications.filter(n => !n.isRead).length;
          this.setUnreadCount(unread);
        })
      );
  }

  markAllAsRead(): Observable<any> {
    return this.apiService
      .put<any>(`notifications/mark-all-read?userId=${this.userId}`, {})
      .pipe(
        tap(() => {
          this.setUnreadCount(0);
          this.triggerRefresh(); // ✅ Notify listeners
        })
      );
  }

  clearAll(): Observable<any> {
    return this.apiService
      .delete<any>(`notifications/clear-all?userId=${this.userId}`)
      .pipe(
        tap(() => {
          this.setUnreadCount(0);
          this.triggerRefresh(); // ✅ Notify listeners
        })
      );
  }

  deleteNotification(id: number): Observable<any> {
    return this.apiService
      .delete<any>(`notifications/delete-notification?notificationId=${id}`)
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

    return this.apiService.post<any>(`notifications/send`, payload).pipe(
      tap(() => this.triggerRefresh()) // ✅ Refresh when new notification is sent
    );
  }
}