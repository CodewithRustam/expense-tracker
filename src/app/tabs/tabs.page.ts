import { Component, OnInit, ViewEncapsulation, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth-service';
import { NotificationService } from '../core/services/notification-service';
import { AddGroupModalComponent } from '../shared/modals/add-group-modal/add-group-modal.component';
import { NotificationListModal } from '../shared/modals/notification-list-modal/notification-list-modal.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class TabsPage implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  public notificationService = inject(NotificationService);
  private modalCtrl = inject(ModalController);

  public userName = signal<string>('User');
  public greetingText = signal<string>('Hello,');
  public isHomeTab = signal<boolean>(true);

  ngOnInit() {
    this.updateGreeting();
    this.setUserNameFromToken();

    this.checkIfHomeTab(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.checkIfHomeTab(e.urlAfterRedirects || e.url));

    this.notificationService.getAll().subscribe();
  }

  private checkIfHomeTab(url: string) {
    this.isHomeTab.set(url.includes('/tabs/home') || url === '/tabs' || url === '/');
  }

  private updateGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) this.greetingText.set('Good Morning,');
    else if (hour >= 12 && hour < 17) this.greetingText.set('Good Afternoon,');
    else if (hour >= 17 && hour < 21) this.greetingText.set('Good Evening,');
    else this.greetingText.set('Good Night,');
  }

  private setUserNameFromToken() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      if (decoded?.unique_name) this.userName.set(decoded.unique_name);
    }
  }

  async openAddGroupModal() {
    const modal = await this.modalCtrl.create({
      component: AddGroupModalComponent,
      breakpoints: [0, 0.5, 0.9],
      initialBreakpoint: 0.5,
      cssClass: 'bottom-sheet-modal'
    });
    await modal.present();
  }

  async openNotifications() {
    const modal = await this.modalCtrl.create({
      component: NotificationListModal,
      mode: 'ios',
      cssClass: 'notification-modal'
    });
    await modal.present();
  }

  goToProfile() {
    this.router.navigate(['tabs/profile']);
  }
}
