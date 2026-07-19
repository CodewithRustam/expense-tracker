import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {
  private lastBackgroundTime: number | null = null;
  private readonly TIMEOUT_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private router: Router,
    private platform: Platform,
    private ngZone: NgZone
  ) {}

  public setupAppStateListener() {
    if (!this.platform.is('capacitor')) return;

    App.addListener('appStateChange', ({ isActive }) => {
      this.ngZone.run(() => {
        if (!isActive) {
          this.lastBackgroundTime = Date.now();
        } else {
          this.checkBackgroundDuration();
        }
      });
    });
  }

  private checkBackgroundDuration() {
    if (this.lastBackgroundTime) {
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastBackgroundTime;

      if (timeDiff > this.TIMEOUT_LIMIT_MS) {
        console.log(`App was backgrounded for ${timeDiff / 1000}s. Resetting to Home.`);
        this.router.navigate(['/tabs/home'], { replaceUrl: true });
      } else {
        console.log('App resumed quickly. Staying on current page.');
      }
      this.lastBackgroundTime = null;
    }
  }
}
