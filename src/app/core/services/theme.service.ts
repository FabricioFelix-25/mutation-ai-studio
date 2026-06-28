import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'mutation-studio-theme';
  readonly isDarkMode = signal(false);

  constructor() {
    this.restoreTheme();
  }

  toggleTheme(): void {
    this.setDarkMode(!this.isDarkMode());
  }

  setDarkMode(enabled: boolean): void {
    this.isDarkMode.set(enabled);

    if (typeof document !== 'undefined') {
      document.body.classList.toggle('theme-dark', enabled);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, enabled ? 'dark' : 'light');
    }
  }

  private restoreTheme(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const savedTheme = window.localStorage.getItem(this.storageKey);

    if (savedTheme === 'dark') {
      this.setDarkMode(true);
      return;
    }

    if (savedTheme === 'light') {
      this.setDarkMode(false);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setDarkMode(prefersDark);
  }
}
