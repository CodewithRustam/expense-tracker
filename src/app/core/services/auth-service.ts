import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, catchError, from, map, of, switchMap, tap, Subject } from 'rxjs';
import { NavController } from '@ionic/angular';
import { SecureTokenService } from './secure-token.service';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private logoutSubject = new Subject<void>();
  public logout$ = this.logoutSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private navCtrl: NavController,
    private secureTokenService: SecureTokenService
  ) { }

  login(userName: string, password: string, rememberMe: boolean): Observable<boolean> {
    const payload = { userName, password };

    return this.apiService.post<{ success: boolean; message: string; token?: string }>(
      'account/login',
      payload
    ).pipe(
      switchMap(res => {
        if (res.success && res.token) {
          // Store token securely (encrypted + in-memory)
          return from(this.secureTokenService.storeToken(res.token, rememberMe)).pipe(
            map(() => true)
          );
        }
        return of(res.success);
      })
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
  verifyResetPasswordLink(code: string): Observable<ApiResponse> {
    return this.apiService.post<ApiResponse>('account/verify-resetpassword-link', { code });
  }
  resetPassword(code: string, password: string): Observable<ApiResponse> {
    const payload = { code, password };

    return this.apiService.post<ApiResponse>(
      'account/reset-password',
      payload
    );
  }
  // Logout
  logout() {
    this.secureTokenService.clearToken();
    localStorage.removeItem('rememberedUser');
    this.logoutSubject.next();
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  // Get JWT token (from secure in-memory storage)
  getToken(): string | null {
    return this.secureTokenService.getToken();
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
    this.secureTokenService.clearToken();
    localStorage.removeItem('rememberedUser');
    this.logoutSubject.next();
    this.navCtrl.navigateRoot('/login').then(() => {
      window.location.reload();
    });
  }
}