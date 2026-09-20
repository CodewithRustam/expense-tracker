import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Toastservice } from '../../../core/services/toastservice';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth-service';

export interface FaqItem {
  category: 'splits' | 'settlement' | 'security' | 'pwa';
  question: string;
  answer: string;
}

@Component({
  selector: 'app-help-support-modal',
  templateUrl: './help-support-modal.component.html',
  styleUrls: ['./help-support-modal.component.scss'],
  standalone: false
})
export class HelpSupportModalComponent implements OnInit {

  supportEmail: string = 'splitx.app.help@gmail.com';
  selectedCategory: 'all' | 'splits' | 'settlement' | 'security' | 'pwa' = 'all';
  expandedFaqIndex: number | null = 0; // Default first item open
  feedbackCategory: string = 'general';
  feedbackText: string = '';
  isSubmitting: boolean = false;
  userEmail: string = '';
  userName: string = '';

  allFaqs: FaqItem[] = [
    {
      category: 'splits',
      question: 'How are expenses split among group members?',
      answer: 'Expenses are calculated dynamically based on selected group members. You can split costs equally or assign custom share amounts per participant. SplitX automatically updates individual balance totals.'
    },
    {
      category: 'splits',
      question: 'Can I edit or delete an expense after adding it?',
      answer: 'Yes! Open the group details page, locate the expense item, and tap to edit or delete. Balances will immediately recalculate for all group members.'
    },
    {
      category: 'settlement',
      question: 'How do I settle my balance with a friend or group?',
      answer: 'Navigate to your group page, tap on the "Settle" button, select the member you paid, enter the settled amount, and tap Confirm. Group balances will update instantly.'
    },
    // {
    //   category: 'settlement',
    //   question: 'Does SplitX process real money transactions directly?',
    //   answer: 'SplitX acts as an accurate digital expense ledger. You can transfer funds using your preferred UPI app, cash, or bank transfer, and log the settlement in SplitX to clear balances.'
    // },
    {
      category: 'security',
      question: 'How is my account and financial data secured?',
      answer: 'All API communication is encrypted via TLS 1.3 SSL protocols. Authentication relies on cryptographically signed tokens and zero plain-text password storage.'
    },
    {
      category: 'security',
      question: 'What happens if I lose my device or log out?',
      answer: 'Your group expense data is securely synchronized on our cloud servers. Simply log in on your new device to access your complete records.'
    },
    // {
    //   category: 'pwa',
    //   question: 'How does SplitX work offline?',
    //   answer: 'SplitX utilizes Progressive Web App (PWA) caching technology. You can view existing groups and expense logs even when offline. Pending changes sync when connectivity is restored.'
    // },
    {
      category: 'pwa',
      question: 'How do instant background PWA updates work?',
      answer: 'SplitX monitors for updates in the background. When a new release is available, a prompt lets you reload instantly to experience the latest features without losing data.'
    }
  ];

  get filteredFaqs(): FaqItem[] {
    if (this.selectedCategory === 'all') return this.allFaqs;
    return this.allFaqs.filter(f => f.category === this.selectedCategory);
  }

  constructor(
    private modalCtrl: ModalController,
    private toastService: Toastservice,
    private http: HttpClient,
    private authService: AuthService
  ) { }

  ngOnInit() {
    const token = this.authService.getToken();
    if (token) {
      const decoded = this.authService.decodeToken(token);
      this.userName = decoded?.unique_name || 'Guest User';
      this.userEmail = decoded?.email || '';
    }
  }

  filterFaq(category: 'all' | 'splits' | 'settlement' | 'security' | 'pwa') {
    this.selectedCategory = category;
    this.expandedFaqIndex = 0; // Open first item of filtered list
  }

  toggleFaq(index: number) {
    if (this.expandedFaqIndex === index) {
      this.expandedFaqIndex = null;
    } else {
      this.expandedFaqIndex = index;
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  copySupportEmail() {
    navigator.clipboard.writeText(this.supportEmail).then(() => {
      this.toastService.success('Support email copied to clipboard!');
    }).catch(() => {
      this.toastService.info(`Contact us at: ${this.supportEmail}`);
    });
  }

  submitFeedback() {
    if (!this.feedbackText.trim()) {
      this.toastService.warning('Please enter your feedback message.');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      _replyto: this.userEmail || this.supportEmail,
      _subject: `[SplitX App Feedback] ${this.feedbackCategory.toUpperCase()}`,
      category: this.feedbackCategory,
      message: this.feedbackText,
      userName: this.userName,
      userEmail: this.userEmail || 'Not Provided',
      appVersion: 'v1.0.1',
      timestamp: new Date().toLocaleString()
    };

    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    const formspreeUrl = `https://formspree.io/${this.supportEmail}`;

    this.http.post(formspreeUrl, payload, { headers }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.feedbackText = '';
        this.toastService.success(`Thank you! Your feedback has been sent to ${this.supportEmail}.`);
      },
      error: (err) => {
        console.warn('Formspree direct post fallback, opening mail client:', err);
        this.isSubmitting = false;

        const subject = encodeURIComponent(`[SplitX Feedback] ${this.feedbackCategory.toUpperCase()}`);
        const body = encodeURIComponent(`Category: ${this.feedbackCategory}\nUser: ${this.userName} (${this.userEmail})\n\nMessage:\n${this.feedbackText}`);
        window.open(`mailto:${this.supportEmail}?subject=${subject}&body=${body}`, '_system');

        this.feedbackText = '';
        this.toastService.success('Feedback mail client opened!');
      }
    });
  }
}
