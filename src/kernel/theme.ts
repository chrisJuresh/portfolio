/** The two papers the Portfolio can be printed on. */
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'portfolio-theme';

/**
 * The theme on screen. Read off the attribute rather than off storage, because
 * the attribute is what every route into a theme change lands on — the toggle
 * here, the system preference this follows until the toggle is used, and the
 * Editor priming storage — and so it is the one thing all of them agree about.
 */
export function theme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function setTheme(next: Theme): void {
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private browsing refuses storage. The theme still applies for this visit;
    // it just is not remembered, which is the right way for this to degrade.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = theme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Run `then` whenever the theme on screen changes, whoever changed it. */
export function onThemeChange(then: (theme: Theme) => void): void {
  new MutationObserver(() => then(theme())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

/**
 * Follow the system preference for as long as the reader has not chosen. Once
 * they have, the stored choice wins and this stops speaking.
 */
export function followSystemTheme(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', (event) => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      stored = null;
    }
    if (stored === 'light' || stored === 'dark') return;
    document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
  });
}
