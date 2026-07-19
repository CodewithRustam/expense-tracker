import { Injectable } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';

@Injectable({ providedIn: 'root' })
export class StatusBarService {

  async setColor(color: string) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    await StatusBar.setBackgroundColor({ color });

    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    });

    await StatusBar.setOverlaysWebView({ overlay: false });
  }
}
