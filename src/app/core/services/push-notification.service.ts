import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from './auth-service';
import { NotificationService } from './notification-service';
import { Toastservice } from './toastservice';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private toast: Toastservice
  ) {}

  public async initPush() {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) return;

    const LAST_REG_KEY = `last_push_registration_${currentUserId}`;
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    
    const lastReg = await Preferences.get({ key: LAST_REG_KEY });
    const lastTime = lastReg.value ? parseInt(lastReg.value, 10) : 0;

    if (now - lastTime < twoHours) {
      console.log('Skipping push registration: Already registered within the last 2h');
      return;
    }

    try {
      const permStatus = await PushNotifications.checkPermissions();
      let status = permStatus.receive;

      if (status !== 'granted') {
        const result = await PushNotifications.requestPermissions();
        status = result.receive;
      }

      await PushNotifications.removeAllListeners();

      PushNotifications.addListener('registration', (token) => {
        this.notificationService.registerPushToken(token.value).subscribe({
          next: async () => {
            await Preferences.set({ key: LAST_REG_KEY, value: Date.now().toString() });
          },
          error: (err) => console.error('❌ Failed to register token', err)
        });
      });

      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('Notification received:', notification);
        const message = notification.body || 'You have a new notification';
        await this.toast.show(message);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('User tapped notification:', notification.notification.data);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err);
      });

      await PushNotifications.register();
    } catch (error) {
      console.error('Error during push init:', error);
    }
  }
}
