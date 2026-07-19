import { Injectable, OnDestroy } from '@angular/core';
import { Network } from '@capacitor/network';
import { BehaviorSubject, interval, Subscription, merge } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService implements OnDestroy {
  private networkStatus = new BehaviorSubject<boolean>(true);
  networkStatus$ = this.networkStatus.asObservable();

  private pollSubscription!: Subscription;
  private readonly POLL_INTERVAL = 5000;

  constructor() {
    this.initializeNetworkListener();
    this.startPolling();
  }

  private async initializeNetworkListener() {
    // Initial status
    const status = await Network.getStatus();
    this.updateStatus(status.connected);

    // Listen for OS-level changes
    Network.addListener('networkStatusChange', (status) => {
      this.updateStatus(status.connected);
    });
  }

  private startPolling() {
    // Poll every 500ms
    const poll$ = interval(this.POLL_INTERVAL).pipe(
      // Use distinctUntilChanged to avoid unnecessary emissions
      distinctUntilChanged()
    );

    this.pollSubscription = poll$.subscribe(async () => {
      try {
        const status = await Network.getStatus();
        this.updateStatus(status.connected);
      } catch (error) {
        console.error('Error polling network status:', error);
      }
    });
  }

  private updateStatus(isConnected: boolean) {
    if (this.networkStatus.value !== isConnected) {
      console.log('Network status updated:', isConnected ? 'ONLINE' : 'OFFLINE');
      this.networkStatus.next(isConnected);
    }
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
    Network.removeAllListeners();
  }
}