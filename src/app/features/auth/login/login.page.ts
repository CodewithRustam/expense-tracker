import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { AppComponent } from '../../../app.component';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBarService } from '../../../core/services/status-bar.service';
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

  if (/(.)\1{2,}/.test(value)) {
    return { repeatingChars: true };
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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: Toastservice,
    private appComponent: AppComponent,
    private platform: Platform,
    private secureTokenService: SecureTokenService,
    private statusBarService: StatusBarService
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
    await this.statusBarService.applyStatusBar();
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
    if (!control) return false;
    const hasValue = control.value !== null && control.value !== undefined && control.value.toString().trim().length > 0;
    return !!(control.invalid && (hasValue || control.dirty || control.touched || this.submitted));
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string | null {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.errors) {
      return null;
    }
    const hasValue = control.value !== null && control.value !== undefined && control.value.toString().trim().length > 0;
    if (!hasValue && !control.dirty && !control.touched && !this.submitted) {
      return null;
    }

    if (fieldName === 'username') {
      if (control.hasError('required')) return 'Username or email is required';
      if (control.hasError('minlength')) return 'Must be at least 3 characters';
      if (control.hasError('maxlength')) return 'Cannot exceed 50 characters';
      if (control.hasError('hasWhitespace')) return 'Cannot contain spaces';
      if (control.hasError('repeatingChars')) return 'Username cannot contain 3 or more repeating characters';
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

  onInput(fieldName: string) {
    const control = this.loginForm.get(fieldName);
    if (control) {
      control.markAsDirty();
      control.updateValueAndValidity({ emitEvent: true });
    }
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
      }
    }, 1000);
  }

  // --- Login Submission ---
  async onLogin() {
    this.submitted = true;

    if (this.cooldownSeconds > 0) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      const userErr = this.getFieldError('username');
      const passErr = this.getFieldError('password');
      if (userErr && passErr) {
        this.toastService.error('Please check your username and password');
      } else if (userErr) {
        this.toastService.error(userErr);
      } else if (passErr) {
        this.toastService.error(passErr);
      }
      return;
    }

    this.isLoading = true;
    const { username, password } = this.loginForm.value;

    this.authService.login(username.trim(), password, this.rememberMe)
      .subscribe({
        next: async (res: any) => {
          this.isLoading = false;
          if (res) {
            console.log('[PushDebug]', 'initPush called AFTER login');
            if (this.platform.is('capacitor')) {
              await this.appComponent.initPush();
            }
            this.router.navigate([this.returnUrl]);
          } else {
            this.toastService.error('Invalid username or password');
          }
        },
        error: (err) => {
          this.isLoading = false;
          const status = err?.status ?? err?.originalError?.status;
          const rawMsg = err?.error?.message || err?.message || err?.originalError?.error?.message;

          // 1. Username or password error (401 Unauthorized from API)
          if (status === 401) {
            this.toastService.error('Invalid username or password');
          }
          // 2. Rate limit / Lockout error from API
          else if (status === 429) {
            this.startCooldown(60);
            const errorMsg = rawMsg && !rawMsg.includes('Http failure')
              ? rawMsg
              : 'Too many login attempts. Account temporarily locked for 60 seconds.';
            this.toastService.error(errorMsg);
          }
          // 3. Network or connection failure (server unreachable)
          else if (status === 0 || !status) {
            this.toastService.error('Unable to connect to server. Please check your internet connection.');
          }
          // 4. Server internal error (500+)
          else if (status >= 500) {
            const errorMsg = rawMsg && !rawMsg.includes('Http failure')
              ? rawMsg
              : 'Server error. Please try again later.';
            this.toastService.error(errorMsg);
          }
          // 5. Other API errors
          else {
            const errorMsg = rawMsg && !rawMsg.includes('Http failure')
              ? rawMsg
              : 'Unable to login. Please try again later.';
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
