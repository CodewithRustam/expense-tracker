import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { ModalController, ToastController } from '@ionic/angular';
import { GlobalModalComponent } from '../modals/global-modal/global-modal.component';
import { GroupService } from '../services/group';
import { ExpenseService } from '../services/expense';
import { Subscription, merge } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, OnDestroy {

  user: any = null;
  totalGroups: number = 0;
  totalSpent: number = 0;

  private refreshSub: Subscription | undefined;

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
    private groupService: GroupService,
    private expenseService: ExpenseService
  ) { }

  ngOnInit() {
    this.loadUserProfile();

    // ✅ Reactive Stats Update
    // If an expense is added/deleted or a group is created, update profile stats silently
    this.refreshSub = merge(
      this.groupService.refresh$,
      this.expenseService.refresh$
    ).subscribe(() => {
      this.loadDashboardStats();
    });
  }

  // ionViewWillEnter is still good for ensuring data is fresh when navigating
  ionViewWillEnter() {
    this.loadDashboardStats();
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadUserProfile() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      this.user = {
        name: decoded?.unique_name || 'Guest',
        email: decoded?.email || 'No Email',
        // Static avatar or logic to fetch from a dedicated user service if available
        avatar: 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&facialHairType=BeardLight&clotheType=BlazerSweater&clotheColor=Blue03&eyeType=Default&eyebrowType=Default&mouthType=Smile&skinColor=Light'
      };
    }
  }

  loadDashboardStats() {
    this.groupService.getGroups().subscribe({
      next: (res: any) => {
        // Handle both Array and Object response formats for robustness
        const data = Array.isArray(res) ? res : res.data;
        const success = Array.isArray(res) ? true : res.success;

        if (success && data) {
          this.totalGroups = data.length;
          // Calculate total spent across all groups
          this.totalSpent = data.reduce((sum: number, group: any) => sum + (group.totalAmount || 0), 0);
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

      // replaceUrl: true prevents the user from clicking "back" into the app
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  editProfile() {
    // Navigate to an edit profile page or open a modal
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
        cancelText: 'Cancel',
        danger: true // Use danger styling if your GlobalModal supports it
      },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    return data === true;
  }
}