import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { AppComponent } from '../../../app.component';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SecureTokenService } from '../../../core/services/secure-token.service';

/**
 * Custom Validator: Validates login identifier (username or email)
 * Disallows unusual characters, spaces, and ensures valid username or email structure.
 */
export function loginIdentifierValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  if (/\s/.test(value)) {
    return { hasWhitespace: true };
  }

  // If input contains '@', validate as email address
  if (value.includes('@')) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      return { invalidEmail: true };
    }
    return null;
  }

  // Otherwise validate as a clean username (letters, numbers, ., -, _)
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(value)) {
    return { invalidCharacters: true };
  }

  if (/^[._-]|[._-]$/.test(value)) {
    return { startEndSpecial: true };
  }

  if (/[._-]{2,}/.test(value)) {
    return { consecutiveSpecial: true };
  }

  return null;
}

/**
 * Custom Validator: Validates password complexity
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (!@#$%^&*...)
 */
export function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';
  if (!value) return null;

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

  const errors: any = {};
  if (!hasUpper) errors.missingUpper = true;
  if (!hasLower) errors.missingLower = true;
  if (!hasNumber) errors.missingNumber = true;
  if (!hasSpecial) errors.missingSpecial = true;

  return Object.keys(errors).length > 0 ? errors : null;
}

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
          Validators.minLength(3),
          Validators.maxLength(50),
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

  async initializeApp() {
    await this.platform.ready();
    if (this.platform.is('capacitor')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#4E54C8' });
    }
  }

  // --- Password Criteria Helpers ---
  get passwordValue(): string {
    return this.loginForm.get('password')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 6;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.passwordValue);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.passwordValue);
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.passwordValue);
  }

  get isPasswordAllValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasNumber && this.hasSpecialChar;
  }

  // --- Field validation helpers ---
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
      if (control.hasError('maxlength')) return 'Cannot exceed 50 characters';
      if (control.hasError('hasWhitespace')) return 'Cannot contain spaces';
      if (control.hasError('invalidEmail')) return 'Please enter a valid email address';
      if (control.hasError('invalidCharacters')) return 'Username can only contain letters, numbers, ., -, and _';
      if (control.hasError('startEndSpecial')) return 'Username must start and end with a letter or number';
      if (control.hasError('consecutiveSpecial')) return 'Username cannot contain consecutive dots, hyphens, or underscores';
    }

    if (fieldName === 'password') {
      if (control.hasError('required')) return 'Password is required';
      if (control.hasError('minlength')) return 'Password must be at least 6 characters';
      if (control.hasError('maxlength')) return 'Password cannot exceed 32 characters';

      const missing = [];
      if (control.hasError('missingUpper')) missing.push('uppercase (A-Z)');
      if (control.hasError('missingLower')) missing.push('lowercase (a-z)');
      if (control.hasError('missingNumber')) missing.push('number (0-9)');
      if (control.hasError('missingSpecial')) missing.push('special character (!@#$)');

      if (missing.length > 0) {
        return `Password must include: ${missing.join(', ')}`;
      }
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
            const errorMsg = 'Invalid credentials. Please try again.';
            this.serverError = errorMsg;
            this.toastService.error(errorMsg);
          }
        },
        error: (err) => {
          this.isLoading = false;
          const status = err?.status ?? err?.originalError?.status;
          const msg = err?.message || err?.error?.message || err?.originalError?.error?.message;

          if (status === 429) {
            this.startCooldown(60);
            const errorMsg = msg || 'Too many attempts. Account locked for 60 seconds.';
            this.serverError = errorMsg;
            this.toastService.error(errorMsg);
          } else if (status === 401) {
            const errorMsg = msg || 'Invalid username or password';
            this.serverError = errorMsg;
            this.toastService.error(errorMsg);
          } else {
            const errorMsg = msg || 'Unable to login. Please try again later.';
            this.serverError = errorMsg;
            this.toastService.error(errorMsg);
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
