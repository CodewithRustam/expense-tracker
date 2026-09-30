import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth-service';
import { GlobalModalComponent } from '../../../shared/modals/global-modal/global-modal.component';

/**
 * Custom Validator: Validates username characters and structure
 * - Disallows starting or ending with dots, underscores, or hyphens
 * - Disallows consecutive special characters (e.g. .., __, --)
 */
export function usernameStructureValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

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
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
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

/**
 * Cross-Field Custom Validator: Ensures confirmPassword matches password
 */
export function confirmPasswordValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.parent) return null;
  const password = control.parent.get('password')?.value;
  const confirmPassword = control.value;
  if (confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: false
})
export class RegistrationPage implements OnInit {
  registerForm!: FormGroup;
  submitted: boolean = false;
  isLoading: boolean = false;
  focusedField: string = '';

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  serverErrorMessage: string | null = null;
  serverErrorList: string[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.registerForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-Z0-9._-]+$/),
          usernameStructureValidator
        ]
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
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
      ],
      confirmPassword: [
        '',
        [
          Validators.required,
          confirmPasswordValidator
        ]
      ]
    });

    // Re-evaluate confirmPassword validity when password changes
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      const confirmCtrl = this.registerForm.get('confirmPassword');
      if (confirmCtrl?.value) {
        confirmCtrl.updateValueAndValidity();
      }
    });
  }

  // --- Form Controls Getter ---
  get f() {
    return this.registerForm.controls;
  }

  get passwordValue(): string {
    return this.registerForm.get('password')?.value || '';
  }

  // --- Password Criteria Helpers ---
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

  // --- 4-Segment Password Strength Meter ---
  get strengthScore(): number {
    const p = this.passwordValue;
    if (!p) return 0;
    let score = 0;
    if (this.hasMinLength) score++;
    if (this.hasUppercase && this.hasLowercase) score++;
    if (this.hasNumber) score++;
    if (this.hasSpecialChar) score++;
    return score;
  }

  get strengthLabel(): string {
    switch (this.strengthScore) {
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  }

  get strengthColor(): string {
    switch (this.strengthScore) {
      case 1: return '#ef4444';
      case 2: return '#f59e0b';
      case 3: return '#06b6d4';
      case 4: return '#10b981';
      default: return '#94a3b8';
    }
  }

  // --- Field Validation Status Helpers ---
  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string | null {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.errors || !(control.dirty || control.touched || this.submitted)) {
      return null;
    }

    if (fieldName === 'username') {
      if (control.hasError('required')) return 'Username is required';
      if (control.hasError('minlength')) return 'Username must be at least 3 characters';
      if (control.hasError('maxlength')) return 'Username cannot exceed 30 characters';
      if (control.hasError('pattern')) return 'Only letters, numbers, dots, hyphens, and underscores allowed';
      if (control.hasError('startEndSpecial')) return 'Username must start and end with a letter or number';
      if (control.hasError('consecutiveSpecial')) return 'Username cannot contain consecutive dots or underscores';
    }

    if (fieldName === 'email') {
      if (control.hasError('required')) return 'Email address is required';
      if (control.hasError('pattern') || control.hasError('email')) return 'Please enter a valid email (e.g. name@example.com)';
      if (control.hasError('maxlength')) return 'Email cannot exceed 100 characters';
    }

    if (fieldName === 'password') {
      if (control.hasError('required')) return 'Password is required';
      if (control.hasError('minlength')) return 'Password must be at least 6 characters';
      if (control.hasError('maxlength')) return 'Password cannot exceed 32 characters';
      if (control.hasError('missingUpper') || control.hasError('missingLower') || control.hasError('missingNumber') || control.hasError('missingSpecial')) {
        return 'Password must satisfy all security requirements below';
      }
    }

    if (fieldName === 'confirmPassword') {
      if (control.hasError('required')) return 'Please confirm your password';
      if (control.hasError('passwordMismatch')) return 'Passwords do not match';
    }

    return null;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onFocus(fieldName: string) {
    this.focusedField = fieldName;
  }

  onBlur(fieldName: string) {
    this.focusedField = '';
    const control = this.registerForm.get(fieldName);
    control?.markAsTouched();
  }

  // --- Form Submission ---
  onRegister() {
    this.submitted = true;
    this.serverErrorMessage = null;
    this.serverErrorList = [];

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username, email, password, confirmPassword } = this.registerForm.value;

    this.isLoading = true;

    this.authService.register(
      username.trim(),
      email.trim().toLowerCase(),
      password,
      confirmPassword
    ).subscribe({
      next: async (success) => {
        this.isLoading = false;
        if (success) {
          this.serverErrorMessage = null;
          this.serverErrorList = [];
          await this.showSuccessModal();
        } else {
          this.serverErrorMessage = 'Registration failed. Please check your details and try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.handleServerError(error);
      }
    });
  }

  private handleServerError(error: any) {
    if (error.error?.data && Array.isArray(error.error.data)) {
      this.serverErrorList = error.error.data;
      this.serverErrorMessage = error.error.message || 'Registration failed.';
    } else if (error.error?.message) {
      this.serverErrorMessage = error.error.message;
    } else if (error.message) {
      this.serverErrorMessage = error.message;
    } else {
      this.serverErrorMessage = 'An unexpected server error occurred. Please try again.';
    }
  }

  async showSuccessModal() {
    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
      backdropDismiss: false,
      cssClass: 'global-modal',
      mode: 'ios',
      componentProps: {
        message: 'Registration Successful! 🎉 Your account has been created.',
        confirmText: 'Go to Login',
        cancelText: 'Stay',
        danger: false
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data === true) {
      this.router.navigate(['/login']);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}