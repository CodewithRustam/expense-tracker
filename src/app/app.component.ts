import { Component, OnInit, ViewChild } from '@angular/core';
import { IonRouterOutlet, Platform } from '@ionic/angular';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { distinctUntilChanged } from 'rxjs/operators';
import { NetworkService } from './services/network-service';
import { PushNotificationService } from './services/push-notification.service';
import { AppUpdateService } from './services/app-update.service';
import { StatusBarService } from './services/status-bar.service';
import { SessionTimeoutService } from './services/session-timeout.service';
import { BackButtonService } from './services/back-button.service';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: false,
})
export class AppComponent implements OnInit {
  @ViewChild(IonRouterOutlet, { static: true }) routerOutlet!: IonRouterOutlet;
  isOnline = true;
  imageUrl!: SafeUrl;

  constructor(
    private platform: Platform,
    private networkService: NetworkService,
    private sanitizer: DomSanitizer,
    private pushNotificationService: PushNotificationService,
    private appUpdateService: AppUpdateService,
    private statusBarService: StatusBarService,
    private sessionTimeoutService: SessionTimeoutService,
    private backButtonService: BackButtonService
  ) {
    this.initializeApp();
    this.listenNetworkStatus();
  }

  ngOnInit() {
    this.imageUrl = this.sanitizer.bypassSecurityTrustUrl(
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="120" height="120" fill="none" stroke="%236366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.83-2.84M8.53 16.11A6 6 0 0 1 12 15M12 20h.01"/></svg>'
    );
  }

  private async initializeApp() {
    await this.platform.ready();

    // 1. Initialize hardware back button handler
    this.backButtonService.initializeBackButton(this.routerOutlet);

    // 2. Initialize PWA update checks
    this.appUpdateService.checkForAppUpdates();

    // 3. Initialize background inactivity timer
    this.sessionTimeoutService.setupAppStateListener();

    // 4. Initialize theme status bar coloring
    setTimeout(() => {
      this.statusBarService.applyStatusBar();
    }, 500);
    this.statusBarService.listenThemeChange();

    // 5. Initialize push notifications
    await this.pushNotificationService.initPush();

    // 6. Hide splash screen
    SplashScreen.hide({ fadeOutDuration: 1200 });
    document.body.classList.add('app-loaded');
  }

  private listenNetworkStatus() {
    this.networkService.networkStatus$.pipe(
      distinctUntilChanged()
    ).subscribe(status => {
      this.isOnline = status;
    });
  }

  async initPush() {
    await this.pushNotificationService.initPush();
  }
}