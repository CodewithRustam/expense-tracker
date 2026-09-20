// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth-service';
import { DeviceFingerprintService } from '../services/device-fingerprint.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private deviceFingerprintService: DeviceFingerprintService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip interceptor for external third-party requests (e.g., Formspree, CDNs)
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      const isOurBackend = req.url.includes('/api/') || req.url.includes('localhost') || req.url.includes('netlify.app');
      if (!isOurBackend) {
        return next.handle(req);
      }
    }

    const publicEndpoints = [
      '/api/account/login',
      '/api/account/register',
      '/api/account/forgot-password',
      '/api/account/reset-password',
      '/api/account/verify-resetpassword-link'
    ];

    // Skip auth for public endpoints
    if (publicEndpoints.some(endpoint => req.url.includes(endpoint))) {
      return next.handle(req);
    }

    // Existing logic (only runs for protected routes)
    if (this.authService.isTokenExpired()) {
      this.authService.clearTokenAndRedirect();
      return throwError(() => new Error('Token expired'));
    }

    const token = this.authService.getToken();
    let authReq = req;

    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Device-Fingerprint': this.deviceFingerprintService.getFingerprintSync()
        }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.clearTokenAndRedirect();
        }
        return throwError(() => error);
      })
    );
  }
}