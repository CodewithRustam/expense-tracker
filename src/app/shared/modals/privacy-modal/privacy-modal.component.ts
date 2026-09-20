import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Toastservice } from '../../../core/services/toastservice';
import { SecureTokenService } from '../../../core/services/secure-token.service';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-privacy-modal',
  templateUrl: './privacy-modal.component.html',
  styleUrls: ['./privacy-modal.component.scss'],
  standalone: false
})
export class PrivacyModalComponent implements OnInit {

  activeTab: 'standards' | 'data' | 'tools' = 'standards';
  isEncryptionActive: boolean = true;
  userEmail: string = '';
  userName: string = '';

  constructor(
    private modalCtrl: ModalController,
    private toastService: Toastservice,
    private secureTokenService: SecureTokenService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      this.userName = decoded?.unique_name || 'Valued User';
      this.userEmail = decoded?.email || 'User Account';
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  clearCache() {
    const keysToRemove = ['et_temp_cache', 'et_recent_searches', 'et_offline_queue'];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    this.toastService.success('Local application cache purged successfully!');
  }

  downloadDataSummary() {
    const summary = {
      title: 'SplitX Expense Tracker - User Data Summary',
      generatedAt: new Date().toISOString(),
      user: {
        name: this.userName,
        email: this.userEmail,
        securityStatus: 'RSA-2048 / AES-256 Token Encryption Active'
      },
      dataPolicies: {
        thirdPartySharing: 'Zero Third-Party Data Sale',
        transportSecurity: 'TLS 1.3 / SSL Encrypted',
        groupAccessScope: 'Private Group Partitioned'
      },
      exportNotice: 'This document provides a portable summary of your account privacy profile in accordance with GDPR & CCPA privacy guidelines.'
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splitx-privacy-export-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.toastService.success('Privacy & Data Summary downloaded!');
  }

  contactDpo() {
    const subject = encodeURIComponent('[SplitX Privacy & Data Inquiry]');
    const body = encodeURIComponent(`Hi Privacy Team,\n\nI have a privacy/data request regarding my account (${this.userEmail}):\n\n[Details Here]`);
    window.open(`mailto:splitx.app.help@gmail.com?subject=${subject}&body=${body}`, '_system');
  }
}
