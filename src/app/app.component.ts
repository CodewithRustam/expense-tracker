import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { IonRouterOutlet, Platform, NavController } from '@ionic/angular';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { distinctUntilChanged } from 'rxjs/operators';
import { NetworkService } from './core/services/network-service';
import { PushNotificationService } from './core/services/push-notification.service';
import { AppUpdateService } from './core/services/app-update.service';
import { StatusBarService } from './core/services/status-bar.service';
import { SessionTimeoutService } from './core/services/session-timeout.service';
import { BackButtonService } from './core/services/back-button.service';
import { SecureTokenService } from './core/services/secure-token.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { App, URLOpenListenerEvent } from '@capacitor/app';

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
    private backButtonService: BackButtonService,
    private secureTokenService: SecureTokenService,
    private router: Router,
    private navCtrl: NavController,
    private zone: NgZone
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

    // 0. Initialize secure token storage (restore encrypted tokens into memory)
    await this.secureTokenService.initialize();

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

    // 6. Setup mobile app deep link URL listener
    this.setupDeepLinkListener();

    // 7. Hide splash screen
    SplashScreen.hide({ fadeOutDuration: 1200 });
    document.body.classList.add('app-loaded');
  }

  private setupDeepLinkListener() {
    // A. Listen for deep link events while the app is already open / running in background
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.handleDeepLink(event.url);
    });

    // B. Check launch URL when app starts fresh from closed state
    App.getLaunchUrl().then(launchUrl => {
      if (launchUrl && launchUrl.url) {
        this.handleDeepLink(launchUrl.url);
      }
    }).catch(err => {
      console.log('Error checking launch URL:', err);
    });
  }

  private handleDeepLink(rawUrl: string) {
    if (!rawUrl) return;
    console.log('App URL opened:', rawUrl);

    if (rawUrl.includes('reset-password')) {
      let code = '';
      try {
        const parsedUrl = new URL(rawUrl);
        code = parsedUrl.searchParams.get('code') ?? '';
      } catch {
        const match = rawUrl.match(/[?&]code=([^&]+)/);
        if (match) {
          code = decodeURIComponent(match[1]);
        }
      }

      this.zone.run(() => {
        const targetPath = code ? `/reset-password?code=${encodeURIComponent(code)}` : '/reset-password';
        console.log('Navigating root to deep link target:', targetPath);
        this.navCtrl.navigateRoot(targetPath);
      });
    }
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