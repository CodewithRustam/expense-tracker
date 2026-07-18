import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Toastservice } from './toastservice';

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
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(async (event) => {
        if (this.updateActivated) return;

        if (event.type === 'VERSION_READY') {
          this.updateActivated = true;
          await this.swUpdate.activateUpdate();
          await this.toast.show('A new version is available. Updating...');
          setTimeout(() => window.location.reload(), 1000);
        }
      });
    }
  }
}
