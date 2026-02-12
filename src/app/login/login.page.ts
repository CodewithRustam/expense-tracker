import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { Platform, ToastController } from '@ionic/angular';
import { AppComponent } from '../app.component';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginData = {
    username: '',
    password: '',
    rememberMe: false
  };
  errorMessage: string | null = null;
  returnUrl: string | null = null;
  isLoading: boolean = false;
  focusedField = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private appComponent: AppComponent,
    private platform: Platform
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/tabs/home';
    const token = localStorage.getItem('authToken');
    if (token) {
      this.router.navigate([this.returnUrl]);
    }
  }
  async initializeApp() {
    await this.platform.ready();
    if (this.platform.is('capacitor')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#4E54C8' }); // Your theme color
    }
  }

  async onLogin() {
    this.isLoading = true;

    this.authService.login(this.loginData.username, this.loginData.password, this.loginData.rememberMe)
      .subscribe({
        next: async (res: any) => {
          this.isLoading = false;
          if (res) {
            this.errorMessage = null;

            console.log('[PushDebug]', 'initPush called AFTER login');
            if (this.platform.is('capacitor')) {
              await this.appComponent.initPush();
            }

            this.router.navigate([this.returnUrl]);
          } else {
            this.showToast('Invalid credentials');
          }
        },
        error: (err) => {
          this.isLoading = false; // Hide loader
          if (err.status === 401) {
            this.showToast('Invalid username or password');
          } else {
            this.showToast('Unable to login. Please try again later.');
          }
        }
      });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  goToRegistration() {
    this.router.navigate(['/registration']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  isPasswordValid(password: string): boolean {
    if (!password) return false;
    const regex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;
    return regex.test(password);
  }

}
