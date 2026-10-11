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
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Exact background color matching: deep obsidian in dark, clean slate in light
      const bgColor = isDark ? '#080a11' : '#f8fafc';

      // Status bar icon / text style:
      // Style.Dark: white/light text and icons (for dark background)
      // Style.Light: dark text and icons (for light background)
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light
      });

      // Set exact status bar color on supported platforms
      await StatusBar.setBackgroundColor({
        color: bgColor
      });

      // Overlay mode ensures webview gradient extends seamlessly behind status bar
      await StatusBar.setOverlaysWebView({ overlay: true });
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
