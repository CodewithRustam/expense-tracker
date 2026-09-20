import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Toastservice } from './toastservice';
import { interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  private updateActivated = false;

  constructor(
    private swUpdate: SwUpdate,
    private toast: Toastservice
  ) {}

  public checkForAppUpdates() {
    if (!this.swUpdate.isEnabled) {
      console.log('⚠️ [PWA Update] Service Worker is disabled (Dev mode or Native App).');
      return;
    }

    console.log('✅ [PWA Update] Service Worker is active and monitoring for updates.');

    // 1. Listen for version updates
    this.swUpdate.versionUpdates.subscribe(async (event) => {
      console.log('🔄 [PWA Update] Event received:', event.type);
      if (this.updateActivated) return;

      if (event.type === 'VERSION_READY') {
        this.updateActivated = true;
        console.log('✨ [PWA Update] New version ready! Triggering toast...');
        this.toast.show('A new version is available. Reloading...', 'success');
        try {
          await this.swUpdate.activateUpdate();
        } catch (e) {
          console.error('[PWA Update] Error activating update:', e);
        }
        setTimeout(() => window.location.reload(), 1500);
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        this.updateActivated = true;
        console.warn('⚠️ [PWA Update] Version installation failed (file mismatch or network issue). Will retry next session.');
      }
    });

    // 2. Initial check for update
    this.triggerCheck();

    // 3. Periodic check every 2 hours
    interval(2 * 60 * 60 * 1000).subscribe(() => this.triggerCheck());

    // 4. Check for update when user switches back to the app tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.triggerCheck();
      }
    });
  }

  private async triggerCheck() {
    if (!this.swUpdate.isEnabled) return;
    try {
      console.log('🔍 [PWA Update] Checking for server updates...');
      const hasUpdate = await this.swUpdate.checkForUpdate();
      console.log('🔍 [PWA Update] Check result:', hasUpdate ? 'Update available!' : 'App is up to date.');
    } catch (err) {
      console.warn('⚠️ [PWA Update] Check for update failed:', err);
    }
  }
}
