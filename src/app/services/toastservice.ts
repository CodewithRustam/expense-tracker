import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Toastservice {
  private container: HTMLElement | null = null;
  
  // 🎨 SVGs stored as strings (Zero Dependencies)
  private icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
  };

  constructor() { }

  private createContainer() {
    if (document.querySelector('.custom-toast-container')) return;
    this.container = document.createElement('div');
    this.container.classList.add('custom-toast-container');
    document.body.appendChild(this.container);
  }

  show(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    if (!this.container) this.createContainer();

    const toast = document.createElement('div');
    toast.classList.add('custom-toast', `toast-${type}`);

    // HTML Structure with Icon, Text, Close Button, and Progress Bar
    toast.innerHTML = `
      <div class="toast-icon">${this.icons[type]}</div>
      <div class="toast-content">${message}</div>
      <div class="toast-close">${this.icons.close}</div>
      <div class="toast-progress"></div>
    `;

    this.container?.appendChild(toast);

    // 1. Enter Animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 2. Logic for Auto-Removal
    let timeoutId: any;
    
    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400); // Wait for exit animation
    };

    // Start timer (3 seconds)
    const startTimer = () => {
      timeoutId = setTimeout(removeToast, 3000);
    };

    startTimer();

    // 3. Pause on Hover / Resume on Leave
    toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    toast.addEventListener('mouseleave', () => startTimer());

    // 4. Manual Close Click
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => {
      clearTimeout(timeoutId);
      removeToast();
    });
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string) { this.show(message, 'error'); }
  warning(message: string) { this.show(message, 'warning'); }
}
