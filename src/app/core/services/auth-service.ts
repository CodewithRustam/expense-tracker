import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, catchError, map, of, tap, Subject } from 'rxjs';
import { NavController } from '@ionic/angular';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'jwtToken';

  private logoutSubject = new Subject<void>();
  public logout$ = this.logoutSubject.asObservable();

  constructor(private apiService: ApiService, private navCtrl: NavController) { }

  login(userName: string, password: string, rememberMe: boolean): Observable<boolean> {
    const payload = { userName, password };

    return this.apiService.post<{ success: boolean; message: string; token?: string }>(
      'account/login',
      payload
    ).pipe(
      tap(res => {
        if (res.success && res.token) {
          if (rememberMe) {
            localStorage.setItem(this.tokenKey, res.token); // persists after app close
          } else {
            sessionStorage.setItem(this.tokenKey, res.token); // cleared on app close
          }
        }
      }),
      map(res => res.success)
    );
  }

  // Registration API
  register(userName: string, email: string, password: string, confirmPassword: string): Observable<boolean> {
    const payload = { userName, email, password, confirmPassword };

    return this.apiService.post<{ success: boolean; message: string }>(
      'account/register',
      payload
    ).pipe(
      map(res => res.success)
    );
  }

  forgotPassword(email: string): Observable<{ success: boolean; message: string; data?: any }> {
    const payload = { Email: email }; // Use correct case to match backend
    console.log('Forgot Password payload:', payload);

    return this.apiService.post<{ success: boolean; message: string; data?: any }>(
      'account/forgot-password',
      payload
    ).pipe(
      catchError(err => {
        console.error('Forgot Password API error:', err);
        return of({ success: false, message: 'Something went wrong. Please try again later.' });
      })
    );
  }
  verifyResetPasswordLink(token: string): Observable<ApiResponse> {
    return this.apiService.post<ApiResponse>('account/verify-resetpassword-link', { shortCode: token });
  }
  resetPassword(token: string, password: string): Observable<ApiResponse> {
    const payload = { token, password };

    return this.apiService.post<ApiResponse>(
      'account/reset-password',
      payload
    );
  }
  // Logout
  logout() {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    this.logoutSubject.next();
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  // Get JWT token
  getToken(): string | null {
    // Check both storages
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
  }
  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    return decoded?.nameid || null;
  }

  // Decode JWT token to get payload
  public decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true; // No token means expired/invalid
    }

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationDate = decoded.exp * 1000;
    const currentTime = Date.now();
    return expirationDate < currentTime;
  }

  // Clear token and redirect to login page
  clearTokenAndRedirect(): void {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    localStorage.removeItem('rememberedUser');
    this.logoutSubject.next();
    this.navCtrl.navigateRoot('/login').then(() => {
      window.location.reload();
    });
  }
}