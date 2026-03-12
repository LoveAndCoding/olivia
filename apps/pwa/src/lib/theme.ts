export type ThemeMode = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'olivia-theme';

export function getStoredThemeMode(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return 'auto';
}

export function applyThemeMode(mode: ThemeMode) {
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    return;
  }

  document.documentElement.setAttribute('data-theme', mode);
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}
