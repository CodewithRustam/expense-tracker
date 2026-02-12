import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { ModalController, ToastController } from '@ionic/angular';
import { GlobalModalComponent } from '../modals/global-modal/global-modal.component';
import { GroupService } from '../services/group';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage {

  // FIX: Initialize as null to satisfy the HTML 'user?.' checks
  user: any = null;

  // Real stats for the profile hero card
  totalGroups: number = 0;
  totalSpent: number = 0;

  settings = [
    { icon: 'notifications-outline', label: 'Notifications' },
    { icon: 'lock-closed-outline', label: 'Privacy' },
    { icon: 'help-circle-outline', label: 'Help & Support' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private modalCtrl: ModalController,
    private groupService: GroupService // Inject to fetch stats
  ) { }

  // Use ionViewWillEnter so data refreshes every time you open the tab
  async ionViewWillEnter() {
    this.loadUserProfile();
    this.loadDashboardStats();
  }

  loadUserProfile() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      this.user = {
        name: decoded?.unique_name || 'Guest',
        email: decoded?.email || 'No Email',
        avatar: 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&facialHairType=BeardLight&clotheType=BlazerSweater&clotheColor=Blue03&eyeType=Default&eyebrowType=Default&mouthType=Smile&skinColor=Light'
      };
    }
  }

  loadDashboardStats() {
    this.groupService.getGroups().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.totalGroups = res.data.length;
          // Calculate total spent across all groups
          this.totalSpent = res.data.reduce((sum: number, group: any) => sum + (group.totalAmount || 0), 0);
        }
      },
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  async logout() {
    const exit = await this.showLogoutConfirmationModal();

    if (exit) {
      this.authService.logout();

      const toast = await this.toastController.create({
        message: 'You have been logged out.',
        duration: 1500,
        color: 'danger',
        position: 'bottom'
      });

      await toast.present();

      setTimeout(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
      }, 1200);
    }
  }

  editProfile() {
    console.log('Edit Profile clicked');
  }

  private async showLogoutConfirmationModal(): Promise<boolean> {
    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
      backdropDismiss: true,
      cssClass: 'global-modal',
      mode: 'ios',
      componentProps: {
        message: 'Are you sure you want to logout?',
        confirmText: 'Logout',
        cancelText: 'Cancel'
      },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    return data === true;
  }
}