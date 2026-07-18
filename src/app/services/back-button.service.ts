import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { IonRouterOutlet, ModalController, NavController, Platform } from '@ionic/angular';
import { AuthService } from './auth-service';
import { GlobalModalComponent } from '../modals/global-modal/global-modal.component';

@Injectable({
  providedIn: 'root'
})
export class BackButtonService {
  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private router: Router,
    private authService: AuthService,
    private modalCtrl: ModalController
  ) {}

  public initializeBackButton(routerOutlet: IonRouterOutlet | undefined) {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      if (routerOutlet && routerOutlet.canGoBack()) {
        routerOutlet.pop();
        return;
      }

      const currentUrl = this.router.url;
      const isAuthenticated = this.authService.isAuthenticated();

      if (!isAuthenticated) {
        if (currentUrl === '/' || currentUrl === '/login') {
          const exit = await this.showExitModal();
          if (exit) App.exitApp();
        } else {
          this.navCtrl.navigateRoot('/');
        }
      } else {
        if (currentUrl !== '/tabs/home') {
          this.navCtrl.navigateRoot('/tabs/home');
        } else {
          const exit = await this.showExitModal();
          if (exit) App.exitApp();
        }
      }
    });
  }

  private async showExitModal(): Promise<boolean> {
    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
      cssClass: 'global-modal',
      componentProps: {
        message: 'Do you want to close this app?',
        confirmText: 'Yes',
        cancelText: 'No'
      },
      backdropDismiss: true,
      mode: 'ios'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    return data === true;
  }
}
