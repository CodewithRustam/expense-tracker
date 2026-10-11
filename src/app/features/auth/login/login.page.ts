import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { AppComponent } from '../../../app.component';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SecureTokenService } from '../../../core/services/secure-token.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  submitted: boolean = false;
  returnUrl: string | null = null;
  isLoading: boolean = false;
  focusedField: string = '';

  showPassword: boolean = false;
  rememberMe: boolean = false;

  cooldownSeconds: number = 0;
  private cooldownInterval: any = null;

  // Server error to display as an inline alert
  serverError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: Toastservice,
    private appComponent: AppComponent,
    private platform: Platform,
    private secureTokenService: SecureTokenService
  ) {
    this.initializeApp();
  }

  async ngOnInit() {
    this.initForm();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/tabs/home';

    await this.secureTokenService.initialize();

    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  ngOnDestroy() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  private initForm() {
    this.loginForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3)
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ]
    });
  }

  async initializeApp() {
    await this.platform.ready();
    if (this.platform.is('capacitor')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#4E54C8' });
    }
  }

  // --- Field helpers ---
  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string | null {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.errors || !(control.dirty || control.touched || this.submitted)) {
      return null;
    }

    if (fieldName === 'username') {
      if (control.hasError('required')) return 'Username or email is required';
      if (control.hasError('minlength')) return 'Must be at least 3 characters';
    }

    if (fieldName === 'password') {
      if (control.hasError('required')) return 'Password is required';
      if (control.hasError('minlength')) return 'Password must be at least 6 characters';
    }

    return null;
  }

  onFocus(fieldName: string) {
    this.focusedField = fieldName;
  }

  onBlur(fieldName: string) {
    this.focusedField = '';
    this.loginForm.get(fieldName)?.markAsTouched();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // --- Cooldown / Rate Limit ---
  startCooldown(seconds: number = 60) {
    this.cooldownSeconds = seconds;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
        this.serverError = null;
      }
    }, 1000);
  }

  // --- Login Submission ---
  async onLogin() {
    this.submitted = true;
    this.serverError = null;

    if (this.cooldownSeconds > 0) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { username, password } = this.loginForm.value;

    this.authService.login(username.trim(), password, this.rememberMe)
      .subscribe({
        next: async (res: any) => {
          this.isLoading = false;
          if (res) {
            this.serverError = null;
            console.log('[PushDebug]', 'initPush called AFTER login');
            if (this.platform.is('capacitor')) {
              await this.appComponent.initPush();
            }
            this.router.navigate([this.returnUrl]);
          } else {
            this.serverError = 'Invalid credentials. Please try again.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          const status = err?.status ?? err?.originalError?.status;
          const msg = err?.message || err?.error?.message || err?.originalError?.error?.message;

          if (status === 429) {
            this.startCooldown(60);
            this.serverError = msg || 'Too many attempts. Account locked for 60 seconds.';
          } else if (status === 401) {
            this.serverError = msg || 'Invalid username or password';
          } else {
            this.serverError = msg || 'Unable to login. Please try again later.';
          }
        }
      });
  }

  goToRegistration() {
    this.router.navigate(['/registration']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
