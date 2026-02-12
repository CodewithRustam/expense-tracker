import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: false
})
export class ForgotPasswordComponent {
  resetData = {
    email: ''
  };
  focusedField = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) { }

  async onResetPassword() {
    console.log(this.resetData.email);
    this.authService.forgotPassword(this.resetData.email).subscribe({
      next: (res) => {
        if (res.success)
          this.showToast(res.message, 'success');
        else
          this.showToast(res.message, 'danger');
      },
      error: (err) => {
        this.showToast('Something went wrong', 'danger');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}
