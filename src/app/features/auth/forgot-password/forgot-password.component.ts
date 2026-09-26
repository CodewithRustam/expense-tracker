import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { Toastservice } from '../../../core/services/toastservice';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  standalone: false
})
export class ForgotPasswordComponent implements OnDestroy {
  resetData = {
    email: ''
  };
  focusedField = '';
  emailSent = false;
  sentEmail = '';

  resendCountdown = 60;
  isResendDisabled = true;
  private timer: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: Toastservice,
    private loadingCtrl: LoadingController
  ) { }

  ngOnDestroy() {
    this.stopTimer();
  }

  async onResetPassword() {
    if (!this.resetData.email) return;

    const loading = await this.loadingCtrl.create({
      message: 'Sending reset link…',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.forgotPassword(this.resetData.email).subscribe({
      next: (res) => {
        loading.dismiss();
        if (res.success) {
          this.sentEmail = this.resetData.email;
          this.emailSent = true;
          this.startResendTimer();
          this.showToast(res.message, 'success');
        } else {
          this.showToast(res.message, 'danger');
        }
      },
      error: (err) => {
        loading.dismiss();
        const msg = err?.originalError?.error?.message ?? err?.message ?? 'Something went wrong. Please try again.';
        this.showToast(msg, 'danger');
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
          this.showToast('Password reset link resent successfully.', 'success');
        } else {
          this.showToast(res.message, 'danger');
        }
      },
      error: (err) => {
        loading.dismiss();
        const msg = err?.originalError?.error?.message ?? err?.message ?? 'Failed to resend link. Please try again.';
        this.showToast(msg, 'danger');
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
    this.router.navigate(['/login']);
  }

  private showToast(message: string, color: 'success' | 'danger') {
    if (color === 'danger') {
      this.toastService.error(message);
    } else {
      this.toastService.success(message);
    }
  }
}
