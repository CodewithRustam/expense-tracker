import { Injectable } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class StatusBarService {
  constructor(private platform: Platform) {}

  public async applyStatusBar() {
    if (!this.platform.is('capacitor')) return;

    try {
      const styles = getComputedStyle(document.documentElement);
      const glow = styles.getPropertyValue('--primary-glow').trim() || '#000000';
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      await StatusBar.setBackgroundColor({
        color: isDark ? glow : '#ffffff'
      });

      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light
      });

      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
      console.warn('StatusBar is not available:', e);
    }
  }

  public listenThemeChange() {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        this.applyStatusBar();
      });
  }
}
