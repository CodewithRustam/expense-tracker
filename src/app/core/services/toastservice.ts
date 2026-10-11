import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Toastservice {
  private container: HTMLElement | null = null;
  private activeTimers: Map<HTMLElement, any> = new Map();
  
  // Precision vector icons inspired by Apple SF Symbols & Lucide
  private icons: Record<string, string> = {
    // Crisp precision Checkmark (no redundant outer circle inside squircle badge)
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    
    // Crisp precision X-Mark
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

    // Context-aware: Server / Network Disconnected
    wifiOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 5.17-2.39"/><path d="M19 12.55a10 10 0 0 0-2.28-1.49"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>`,

    // Context-aware: Authentication / Credentials
    lock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/></svg>`,
    
    // Precision warning alert triangle
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    
    // Precision info
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    
    // Minimal close
    close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  private getIcon(type: string, message: string): string {
    if (type === 'error') {
      if (/connect|server|network|internet|offline/i.test(message)) {
        return this.icons['wifiOff'] || this.icons['error'];
      }
      if (/password|username|auth|login|credential/i.test(message)) {
        return this.icons['lock'] || this.icons['error'];
      }
      return this.icons['error'];
    }
    return this.icons[type] || this.icons['success'];
  }

  constructor() { }

  private createContainer() {
    let container = document.querySelector('.custom-toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.classList.add('custom-toast-container');
      document.body.appendChild(container);
    }
    this.container = container;
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', title?: string, durationMs: number = 4200) {
    if (!this.container) this.createContainer();

    // Prevent duplicate spam: if identical toast is already active, pulse it and reset timer
    const existing = this.container?.querySelector(`[data-toast-key="${type}:${message}"]`) as HTMLElement;
    if (existing) {
      existing.classList.remove('pulse');
      void existing.offsetWidth; // force reflow
      existing.classList.add('pulse');
      
      const oldTimer = this.activeTimers.get(existing);
      if (oldTimer) clearTimeout(oldTimer);
      
      const newTimer = setTimeout(() => {
        existing.classList.remove('show');
        existing.classList.add('hide');
        setTimeout(() => existing.remove(), 280);
      }, durationMs);
      this.activeTimers.set(existing, newTimer);
      return;
    }

    // Limit active toasts to max 2 to prevent stacking clutter
    if (this.container && this.container.children.length >= 2) {
      const oldest = this.container.children[0] as HTMLElement;
      oldest.classList.remove('show');
      oldest.classList.add('hide');
      setTimeout(() => oldest.remove(), 250);
    }

    // Smart typographic hierarchy (Title + Subtitle)
    let toastTitle = title || '';
    let toastDesc = '';

    if (!toastTitle) {
      if (message.includes('. ')) {
        const firstDot = message.indexOf('. ');
        toastTitle = message.substring(0, firstDot);
        toastDesc = message.substring(firstDot + 2);
      } else if (type === 'error') {
        if (/invalid.*(user|pass|cred)/i.test(message)) {
          toastTitle = 'Authentication Error';
          toastDesc = message;
        } else if (/connect|server|network|internet/i.test(message)) {
          toastTitle = 'Connection Error';
          toastDesc = message;
        } else {
          toastTitle = 'Notice';
          toastDesc = message;
        }
      } else if (type === 'success') {
        toastTitle = 'Success';
        toastDesc = message;
      } else if (type === 'warning') {
        toastTitle = 'Warning';
        toastDesc = message;
      } else {
        toastTitle = message;
        toastDesc = '';
      }
    } else {
      toastDesc = message;
    }

    const toast = document.createElement('div');
    toast.classList.add('custom-toast', `toast-${type}`);
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('data-toast-key', `${type}:${message}`);

    toast.innerHTML = `
      <div class="toast-ambient-glow"></div>
      <div class="toast-glass-shine"></div>
      <div class="toast-icon-badge">${this.getIcon(type, message)}</div>
      <div class="toast-content">
        ${toastTitle ? `<div class="toast-title">${toastTitle}</div>` : ''}
        ${toastDesc ? `<div class="toast-desc">${toastDesc}</div>` : ''}
      </div>
      <button type="button" class="toast-close-btn" aria-label="Dismiss">${this.icons['close']}</button>
    `;

    this.container?.appendChild(toast);

    // Spring entrance
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
    });

    // Auto-dismiss lifecycle
    let timeoutId: any;
    let isRemoved = false;

    const removeToast = () => {
      if (isRemoved) return;
      isRemoved = true;
      toast.classList.remove('show');
      toast.classList.add('hide');
      this.activeTimers.delete(toast);
      setTimeout(() => toast.remove(), 280);
    };

    const startTimer = () => {
      timeoutId = setTimeout(removeToast, durationMs);
      this.activeTimers.set(toast, timeoutId);
    };

    startTimer();

    // Pause on hover
    toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    toast.addEventListener('mouseleave', () => startTimer());

    // Close button
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(timeoutId);
      removeToast();
    });

    // Tap to dismiss
    toast.addEventListener('click', () => {
      clearTimeout(timeoutId);
      removeToast();
    });

    // Mobile swipe up to dismiss
    let startY = 0;
    toast.addEventListener('touchstart', (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    toast.addEventListener('touchmove', (e: TouchEvent) => {
      const diffY = e.touches[0].clientY - startY;
      if (diffY < 0) {
        toast.style.transform = `translateY(${diffY}px) scale(${Math.max(0.9, 1 + diffY / 400)})`;
        toast.style.opacity = `${Math.max(0, 1 + diffY / 120)}`;
      }
    }, { passive: true });

    toast.addEventListener('touchend', (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      if (endY - startY < -35) {
        removeToast();
      } else {
        toast.style.transform = '';
        toast.style.opacity = '';
      }
    });
  }

  success(message: string, title?: string) { this.show(message, 'success', title); }
  error(message: string, title?: string) { this.show(message, 'error', title); }
  warning(message: string, title?: string) { this.show(message, 'warning', title); }
  info(message: string, title?: string) { this.show(message, 'info', title); }
}
