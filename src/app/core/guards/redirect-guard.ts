import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { SecureTokenService } from '../services/secure-token.service';

@Injectable({
  providedIn: 'root'
})
export class RedirectGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private secureTokenService: SecureTokenService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    // Ensure token is restored from encrypted storage before checking auth
    await this.secureTokenService.initialize();

    if (this.authService.isAuthenticated()) {
      // ✅ User already logged in — send them to returnUrl if present (and not login/register), otherwise home
      const rawReturnUrl = route.queryParams['returnUrl'] || state.root.queryParams['returnUrl'];
      const decodedUrl = rawReturnUrl ? decodeURIComponent(rawReturnUrl) : '';
      if (decodedUrl && !decodedUrl.includes('/login') && !decodedUrl.includes('/registration')) {
        this.router.navigateByUrl(decodedUrl);
      } else {
        this.router.navigate(['/tabs/home']);
      }
      return false;
    }

    return true;
  }
}
