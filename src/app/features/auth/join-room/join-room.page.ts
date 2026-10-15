import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { GroupService } from '../../../core/services/group';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBarService } from '../../../core/services/status-bar.service';
import { SecureTokenService } from '../../../core/services/secure-token.service';

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
  currentUserName: string | null = null;
  currentUserEmail: string | null = null;
  autoAccept: boolean = false;

  // Smart Authentication State
  isRegisteredUser: boolean = false;

  // Existing User Login Form
  loginPassword: string = '';
  showLoginPassword: boolean = false;
  isLoggingIn: boolean = false;
  loginError: string = '';

  // New User Registration Form
  newUsername: string = '';
  newPassword: string = '';
  showNewPassword: boolean = false;
  isRegistering: boolean = false;
  registerError: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private authService: AuthService,
    private groupService: GroupService,
    private toastService: Toastservice,
    private statusBarService: StatusBarService,
    private secureTokenService: SecureTokenService,
    private platform: Platform
  ) {}

  async ngOnInit() {
    await this.platform.ready();
    await this.statusBarService.applyStatusBar();

    // 1. Ensure token is restored from storage into memory before checking auth
    await this.secureTokenService.initialize();
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      this.currentUserName = this.authService.getUserName();
      this.currentUserEmail = this.authService.getUserEmail();
    }

    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.autoAccept = this.route.snapshot.queryParamMap.get('autoAccept') === 'true';

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
          this.isRegisteredUser = !!this.invitation.isRegisteredUser;

          // Pre-fill suggested username for new users based on invited name
          if (!this.newUsername && this.invitation.invitedName) {
            const sanitized = this.invitation.invitedName
              .trim()
              .replace(/[^a-zA-Z0-9._-]/g, '_')
              .toLowerCase();
            this.newUsername = sanitized.length >= 3 ? sanitized : `user_${sanitized}`;
          }

          // If autoAccept is requested and user is authenticated and invite is active, accept immediately
          if (this.isLoggedIn && this.autoAccept && !this.isExpired && !this.isAlreadyAccepted) {
            this.acceptInvitation();
          }
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

  // --- Password Validation Getters for New Users ---
  get hasMinLength(): boolean {
    return (this.newPassword || '').length >= 6;
  }

  get hasUpper(): boolean {
    return /[A-Z]/.test(this.newPassword || '');
  }

  get hasLower(): boolean {
    return /[a-z]/.test(this.newPassword || '');
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword || '');
  }

  get hasSpecial(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.newPassword || '');
  }

  get isPasswordValid(): boolean {
    return this.hasMinLength && this.hasUpper && this.hasLower && this.hasNumber && this.hasSpecial;
  }

  // --- 1-Step Login & Join (for Registered Users) ---
  onLoginAndJoin() {
    if (!this.loginPassword || this.isLoggingIn) return;

    this.isLoggingIn = true;
    this.loginError = '';

    const identifier = (this.invitation?.invitedEmail || '').trim();

    this.authService.login(identifier, this.loginPassword, true).subscribe({
      next: (res: any) => {
        if (res) {
          this.isLoggedIn = true;
          this.currentUserName = this.authService.getUserName();
          this.currentUserEmail = this.authService.getUserEmail();
          this.acceptInvitation();
        } else {
          this.isLoggingIn = false;
          this.loginError = 'Invalid password. Please try again.';
          this.toastService.error('Invalid password.');
        }
      },
      error: (err) => {
        this.isLoggingIn = false;
        const msg = err?.error?.message || err?.message || 'Unable to log in. Please check your password.';
        this.loginError = msg;
        this.toastService.error(msg);
      }
    });
  }

  // --- 1-Step Create Account & Join (for New Users) ---
  onCreateAndJoin() {
    if (this.isRegistering) return;

    const username = (this.newUsername || '').trim();
    const email = (this.invitation?.invitedEmail || '').trim().toLowerCase();
    const password = this.newPassword;

    if (!username || username.length < 3) {
      this.registerError = 'Username must be at least 3 characters.';
      return;
    }

    if (/\s/.test(username)) {
      this.registerError = 'Username cannot contain spaces.';
      return;
    }

    if (!this.isPasswordValid) {
      this.registerError = 'Please satisfy all password criteria.';
      return;
    }

    this.isRegistering = true;
    this.registerError = '';

    this.authService.register(username, email, password, password).subscribe({
      next: (success) => {
        if (success) {
          // Immediately log the user in
          this.authService.login(username, password, true).subscribe({
            next: (loginSuccess) => {
              if (loginSuccess) {
                this.isLoggedIn = true;
                this.currentUserName = this.authService.getUserName();
                this.currentUserEmail = this.authService.getUserEmail();
                this.acceptInvitation();
              } else {
                this.isRegistering = false;
                this.goToLogin();
              }
            },
            error: () => {
              this.isRegistering = false;
              this.goToLogin();
            }
          });
        } else {
          this.isRegistering = false;
          this.registerError = 'Registration failed. Please check your details.';
        }
      },
      error: (err) => {
        this.isRegistering = false;
        let msg = 'Registration failed.';
        if (err?.error?.data && Array.isArray(err.error.data) && err.error.data.length > 0) {
          msg = err.error.data[0];
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.message) {
          msg = err.message;
        }
        this.registerError = msg;
        this.toastService.error(msg);
      }
    });
  }

  // --- Accept Room Invitation ---
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
        this.isLoggingIn = false;
        this.isRegistering = false;

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
        this.isLoggingIn = false;
        this.isRegistering = false;
        const msg = err?.error?.message || err?.message || 'An error occurred while accepting the invitation.';
        this.toastService.error(msg);
      }
    });
  }

  goToLogin() {
    const returnUrl = encodeURIComponent(`/join-room?token=${this.token}&autoAccept=true`);
    this.navCtrl.navigateRoot(`/login?returnUrl=${returnUrl}`, { animated: false });
  }

  goToRegister() {
    const returnUrl = encodeURIComponent(`/join-room?token=${this.token}&autoAccept=true`);
    this.navCtrl.navigateRoot(`/registration?returnUrl=${returnUrl}`, { animated: false });
  }

  goToForgotPassword() {
    this.navCtrl.navigateRoot('/forgot-password', { animated: false });
  }

  switchAccount() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUserName = null;
    this.currentUserEmail = null;
    this.goToLogin();
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
