import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
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

  constructor(private authService: AuthService, private router: Router) { }
  onRegister() {
    if (this.registerData.username.length < 3) {
      this.errorMessage = 'Username must be at least 3 characters';
    } else if (!this.registerData.email.includes('@')) {
      this.errorMessage = 'Invalid email address';
    } else if (this.registerData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
    } else if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
    } else {
      this.authService.register(
        this.registerData.username,
        this.registerData.email,
        this.registerData.password,
        this.registerData.confirmPassword
      ).subscribe(success => {
        if (success) {
          this.errorMessage = null;
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Registration failed';
        }
      }, error => {
        this.errorMessage = 'Registration failed: ' + (error.error?.message || error.message);
      });
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}