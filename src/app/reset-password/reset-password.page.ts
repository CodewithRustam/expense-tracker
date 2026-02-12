// reset-password.page.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService, ApiResponse } from '../services/auth-service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  code!: string;
  password = '';
  confirmPassword = '';
  focusedField = '';

  tokenValid = false;          
  checkingToken = true;       

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.code = this.route.snapshot.queryParamMap.get('code') ?? '';

    if (!this.code) {
      this.checkingToken = false;
      this.tokenValid = false;
      this.showToast('No reset code found in the URL.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Checking link…',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.verifyResetPasswordLink(this.code).subscribe({
      next: (res: ApiResponse) => {
        loading.dismiss();
        this.checkingToken = false;
        this.tokenValid = res.success;

        if (!res.success) this.showToast(res.message, 'danger');
      },
      error: (err) => {
        loading.dismiss();
        this.checkingToken = false;
        this.tokenValid = false;
        this.showToast(err?.error?.message ?? 'Failed to verify link.', 'danger');
      }
    });
  }

  async showToast(message: string, color: string = 'medium') {
    const t = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await t.present();
  }

  async resetPassword() {
    if (!this.password || !this.confirmPassword) {
      this.showToast('Please fill all fields', 'warning');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.showToast('Passwords do not match', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Updating…' });
    await loading.present();

    this.authService.resetPassword(this.code, this.password).subscribe({
      next: (res) => {
        loading.dismiss();
        if (res.success) {
          this.showToast(res.message, 'success');
          this.router.navigate(['/login']);
        } else {
          this.showToast(res.message, 'danger');
        }
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err?.error?.message ?? 'Something went wrong', 'danger');
      }
    });
  }
}