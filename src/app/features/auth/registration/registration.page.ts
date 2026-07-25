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
          await this.showSuccessModal();
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

    // Redirect to login regardless of which button is pressed (both are fine after success)
    const { data } = await modal.onDidDismiss();
    if (data === true) {
      this.router.navigate(['/login']);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}