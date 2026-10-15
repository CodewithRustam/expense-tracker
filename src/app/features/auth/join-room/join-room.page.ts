import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { GroupService } from '../../../core/services/group';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBarService } from '../../../core/services/status-bar.service';
import { SecureTokenService } from '../../../core/services/secure-token.service';
import { loginIdentifierValidator, passwordComplexityValidator } from '../login/login.page';

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

  // Reactive Forms matching LoginPage design & validation
  existingUserForm!: FormGroup;
  newUserForm!: FormGroup;

  focusedField: string = '';
  submittedExisting: boolean = false;
  submittedNew: boolean = false;

  showLoginPassword: boolean = false;
  showNewPassword: boolean = false;

  isLoggingIn: boolean = false;
  isRegistering: boolean = false;
  loginError: string = '';
  registerError: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private authService: AuthService,
    private groupService: GroupService,
    private toastService: Toastservice,
    private statusBarService: StatusBarService,
    private secureTokenService: SecureTokenService,
    private platform: Platform
  ) {
    this.initForms();
  }

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

  private initForms() {
    this.existingUserForm = this.fb.group({
      password: ['', [Validators.required]]
    });

    this.newUserForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          loginIdentifierValidator
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(32),
          passwordComplexityValidator
        ]
      ]
    });
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

          // Pre-fill default suggested username for new users based on invited name
          if (this.invitation.invitedName && !this.newUserForm.get('username')?.value) {
            const sanitized = this.invitation.invitedName
              .trim()
              .replace(/[^a-zA-Z0-9._-]/g, '_')
              .toLowerCase();
            const defaultUser = sanitized.length >= 3 ? sanitized : `user_${sanitized}`;
            this.newUserForm.get('username')?.setValue(defaultUser);
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

  // --- Form Interaction & Validation Helpers (identical to LoginPage) ---
  onFocus(fieldName: string) {
    this.focusedField = fieldName;
  }

  onBlur(fieldName: string) {
    this.focusedField = '';
    this.existingUserForm.get(fieldName)?.markAsTouched();
    this.newUserForm.get(fieldName)?.markAsTouched();
  }

  onInput(formType: 'existing' | 'new', fieldName: string) {
    const form = formType === 'existing' ? this.existingUserForm : this.newUserForm;
    const control = form.get(fieldName);
    if (control) {
      control.markAsDirty();
      control.updateValueAndValidity({ emitEvent: true });
    }
  }

  isFieldInvalid(formType: 'existing' | 'new', fieldName: string): boolean {
    const form = formType === 'existing' ? this.existingUserForm : this.newUserForm;
    const submitted = formType === 'existing' ? this.submittedExisting : this.submittedNew;
    const control = form.get(fieldName);
    if (!control) return false;
    const hasValue = control.value !== null && control.value !== undefined && control.value.toString().trim().length > 0;
    return !!(control.invalid && (hasValue || control.dirty || control.touched || submitted));
  }

  isFieldValid(formType: 'existing' | 'new', fieldName: string): boolean {
    const form = formType === 'existing' ? this.existingUserForm : this.newUserForm;
    const control = form.get(fieldName);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  getFieldError(formType: 'existing' | 'new', fieldName: string): string | null {
    const form = formType === 'existing' ? this.existingUserForm : this.newUserForm;
    const submitted = formType === 'existing' ? this.submittedExisting : this.submittedNew;
    const control = form.get(fieldName);
    if (!control || !control.errors) return null;
    const hasValue = control.value !== null && control.value !== undefined && control.value.toString().trim().length > 0;
    if (!hasValue && !control.dirty && !control.touched && !submitted) return null;

    if (fieldName === 'username') {
      if (control.hasError('required')) return 'Username is required';
      if (control.hasError('minlength')) return 'Username must be at least 3 characters';
      if (control.hasError('maxlength')) return 'Username cannot exceed 30 characters';
      if (control.hasError('hasWhitespace')) return 'Username cannot contain spaces';
      if (control.hasError('repeatingChars')) return 'Cannot contain 3 or more repeating characters';
      if (control.hasError('invalidCharacters')) return 'Only letters, numbers, and . _ - are allowed';
      if (control.hasError('startEndSpecial')) return 'Cannot start or end with special characters';
      if (control.hasError('consecutiveSpecial')) return 'Cannot have consecutive special characters';
    }

    if (fieldName === 'password') {
      if (control.hasError('required')) return 'Password is required';
      if (control.hasError('minlength')) return 'Password must be at least 6 characters';
      if (control.hasError('missingUpper')) return 'Must contain at least 1 uppercase letter';
      if (control.hasError('missingLower')) return 'Must contain at least 1 lowercase letter';
      if (control.hasError('missingNumber')) return 'Must contain at least 1 number';
      if (control.hasError('missingSpecial')) return 'Must contain at least 1 special character (!@#$%^&*)';
    }

    return null;
  }

  // --- Password Criteria Helpers (for New User) ---
  get newPasswordValue(): string {
    return this.newUserForm.get('password')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.newPasswordValue.length >= 6;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPasswordValue);
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.newPasswordValue);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.newPasswordValue);
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.newPasswordValue);
  }

  get isNewPasswordAllValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasNumber && this.hasSpecialChar;
  }

  toggleLoginPassword() {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  // --- 1-Step Login & Join (for Registered Users) ---
  onLoginAndJoin() {
    this.submittedExisting = true;
    if (this.existingUserForm.invalid || this.isLoggingIn) {
      this.existingUserForm.markAllAsTouched();
      return;
    }

    this.isLoggingIn = true;
    this.loginError = '';

    const identifier = (this.invitation?.invitedEmail || '').trim();
    const password = this.existingUserForm.get('password')?.value;

    this.authService.login(identifier, password, true).subscribe({
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
    this.submittedNew = true;
    if (this.newUserForm.invalid || this.isRegistering) {
      this.newUserForm.markAllAsTouched();
      return;
    }

    const username = this.newUserForm.get('username')?.value.trim();
    const email = (this.invitation?.invitedEmail || '').trim().toLowerCase();
    const password = this.newUserForm.get('password')?.value;

    this.isRegistering = true;
    this.registerError = '';

    this.authService.register(username, email, password, password).subscribe({
      next: (success) => {
        if (success) {
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
