import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth-service';
import { GlobalModalComponent } from '../../../shared/modals/global-modal/global-modal.component';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  standalone: false
})
export class RegistrationPage {
  registerData = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController
  ) { }

  onRegister() {
    if (this.registerData.username.length < 3) {
      this.errorMessage = 'Username must be at least 3 characters';
      return;
    } else if (!this.registerData.email.includes('@')) {
      this.errorMessage = 'Invalid email address';
      return;
    } else if (this.registerData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    } else if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.register(
      this.registerData.username,
      this.registerData.email,
      this.registerData.password,
      this.registerData.confirmPassword
    ).subscribe({
      next: async (success) => {
        this.isLoading = false;
        if (success) {
          this.errorMessage = null;
          await this.showSuccessGlobalModal();
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Registration failed: ' + (error.error?.message || error.message || 'Server error');
      }
    });
  }

  async showSuccessGlobalModal() {
    const modal = await this.modalCtrl.create({
      component: GlobalModalComponent,
      backdropDismiss: false,
      cssClass: 'global-modal',
      mode: 'ios',
      componentProps: {
        message: '<strong>Registration Successful! 🎉</strong><br><br>Your account has been created successfully. Click OK to log in.',
        confirmText: 'OK',
        cancelText: '',
        danger: false
      }
    });

    await modal.present();

    await modal.onDidDismiss();
    this.router.navigate(['/login']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}