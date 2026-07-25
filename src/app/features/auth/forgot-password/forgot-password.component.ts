import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { Toastservice } from '../../../core/services/toastservice';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
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
    private toastService: Toastservice
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

  private showToast(message: string, color: 'success' | 'danger') {
    if (color === 'danger') {
      this.toastService.error(message);
    } else {
      this.toastService.success(message);
    }
  }
}
