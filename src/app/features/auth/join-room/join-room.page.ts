import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { GroupService } from '../../../core/services/group';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBarService } from '../../../core/services/status-bar.service';

@Component({
  selector: 'app-join-room',
  templateUrl: './join-room.page.html',
  styleUrls: ['./join-room.page.scss'],
  standalone: false
})
export class JoinRoomPage implements OnInit {
  token: string = '';
  isLoading: boolean = true;
  isAccepting: boolean = false;
  errorMsg: string = '';
  isExpired: boolean = false;
  isAlreadyAccepted: boolean = false;
  invitation: any = null;
  isLoggedIn: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private authService: AuthService,
    private groupService: GroupService,
    private toastService: Toastservice,
    private statusBarService: StatusBarService,
    private platform: Platform
  ) {}

  async ngOnInit() {
    await this.platform.ready();
    await this.statusBarService.applyStatusBar();

    this.isLoggedIn = this.authService.isAuthenticated();
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.isLoading = false;
      this.errorMsg = 'No invitation token found. Please check the link from your email.';
      return;
    }

    this.loadInvitationDetails();
  }

  loadInvitationDetails() {
    this.isLoading = true;
    this.errorMsg = '';

    this.groupService.getInvitationDetails(this.token).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.success && res.data) {
          this.invitation = res.data;
          this.isExpired = !!this.invitation.isExpired || this.invitation.status === 'Expired';
          this.isAlreadyAccepted = this.invitation.status === 'Accepted';
        } else {
          this.errorMsg = res?.message || 'Invalid or expired invitation.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || err?.message || 'Unable to load invitation details.';
      }
    });
  }

  acceptInvitation() {
    if (!this.token || this.isAccepting) return;

    if (!this.isLoggedIn) {
      this.goToLogin();
      return;
    }

    this.isAccepting = true;
    this.groupService.acceptInvitation(this.token).subscribe({
      next: (res: any) => {
        this.isAccepting = false;
        if (res?.success) {
          this.toastService.success(res.message || 'Successfully joined room!');
          const roomId = res.data || this.invitation?.roomId;
          if (roomId) {
            this.navCtrl.navigateRoot(`/tabs/expenses?roomId=${roomId}`, { animated: false });
          } else {
            this.navCtrl.navigateRoot('/tabs/home', { animated: false });
          }
        } else {
          this.toastService.error(res?.message || 'Failed to accept invitation.');
        }
      },
      error: (err) => {
        this.isAccepting = false;
        const msg = err?.error?.message || err?.message || 'An error occurred while accepting the invitation.';
        this.toastService.error(msg);
      }
    });
  }

  goToLogin() {
    const returnUrl = encodeURIComponent(`/join-room?token=${this.token}`);
    this.navCtrl.navigateRoot(`/login?returnUrl=${returnUrl}`, { animated: false });
  }

  goToRegister() {
    const returnUrl = encodeURIComponent(`/join-room?token=${this.token}`);
    this.navCtrl.navigateRoot(`/registration?returnUrl=${returnUrl}`, { animated: false });
  }

  goToDashboard() {
    if (this.invitation?.roomId) {
      this.navCtrl.navigateRoot(`/tabs/expenses?roomId=${this.invitation.roomId}`, { animated: false });
    } else {
      this.navCtrl.navigateRoot('/tabs/home', { animated: false });
    }
  }

  goToHome() {
    this.navCtrl.navigateRoot(this.isLoggedIn ? '/tabs/home' : '/login', { animated: false });
  }
}
