import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { Toastservice } from '../../../core/services/toastservice';
import { StatusBarService } from '../../../core/services/status-bar.service';

/**
 * Strict RFC 5322-compliant email validator
 */
export function emailFormatValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';
  if (!value) return null;

  if (/\s/.test(value)) {
    return { hasWhitespace: true };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(value)) {
    return { invalidEmail: true };
  }

  return null;
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  standalone: false
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotForm!: FormGroup;
  submitted = false;
  focusedField = '';
  emailSent = false;
  sentEmail = '';

  resendCountdown = 60;
  isResendDisabled = true;
  private timer: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: Toastservice,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private statusBarService: StatusBarService,
    private platform: Platform
  ) { }

  async ngOnInit() {
    this.forgotForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          emailFormatValidator
        ]
      ]
    });
    await this.platform.ready();
    await this.statusBarService.applyStatusBar();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.forgotForm.get(fieldName);
    if (!control) return false;
    const hasValue = control.value !== null && control.value !== undefined && control.value.toString().trim().length > 0;
    return !!(control.invalid && (hasValue || control.dirty || control.touched || this.submitted));
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.forgotForm.get(fieldName);
    return !!(control && control.valid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string | null {
    const control = this.forgotForm.get(fieldName);
    if (!control || !control.errors) return null;

    const hasValue = control.value !== null && control.value !== undefined && control.value.toString().trim().length > 0;
    if (!hasValue && !control.dirty && !control.touched && !this.submitted) {
      return null;
    }

    if (fieldName === 'email') {
      if (control.hasError('required')) return 'Email address is required';
      if (control.hasError('hasWhitespace')) return 'Email cannot contain spaces';
      if (control.hasError('invalidEmail') || control.hasError('email')) {
        return 'Please enter a valid email address (e.g. name@example.com)';
      }
    }

    return null;
  }

  async onResetPassword() {
    this.submitted = true;

    if (this.forgotForm.invalid) {
      const errorMsg = this.getFieldError('email') || 'Please enter a valid email address';
      this.toastService.error(errorMsg);
      return;
    }

    const email = this.forgotForm.get('email')?.value?.trim();
    if (!email) return;

    const loading = await this.loadingCtrl.create({
      message: 'Sending recovery link…',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        loading.dismiss();
        if (res.success) {
          this.sentEmail = email;
          this.emailSent = true;
          this.startResendTimer();
          this.toastService.success(res.message || 'Recovery email sent successfully!');
        } else {
          this.toastService.error(res.message);
        }
      },
      error: (err) => {
        loading.dismiss();
        const msg = err?.error?.message ?? err?.originalError?.error?.message ?? err?.message ?? 'Failed to send recovery link. Please try again.';
        this.toastService.error(msg);
      }
    });
  }

  async resendEmail() {
    if (!this.sentEmail || this.isResendDisabled) return;

    const loading = await this.loadingCtrl.create({
      message: 'Resending link…',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.forgotPassword(this.sentEmail).subscribe({
      next: (res) => {
        loading.dismiss();
        if (res.success) {
          this.startResendTimer();
          this.toastService.success('Password reset link resent successfully.');
        } else {
          this.toastService.error(res.message);
        }
      },
      error: (err) => {
        loading.dismiss();
        const msg = err?.error?.message ?? err?.originalError?.error?.message ?? err?.message ?? 'Failed to resend link. Please try again.';
        this.toastService.error(msg);
      }
    });
  }

  startResendTimer() {
    this.stopTimer();
    this.resendCountdown = 60;
    this.isResendDisabled = true;

    this.timer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.stopTimer();
        this.isResendDisabled = false;
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  goToLogin() {
    this.stopTimer();
    this.navCtrl.navigateRoot('/login', { animated: false });
  }
}
