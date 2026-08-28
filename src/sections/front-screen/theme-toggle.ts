import { onThemeChange, theme, toggleTheme } from '../../kernel/theme';

/** The attribute the switch is found by, so the markup carries no id for this. */
export const TOGGLE = 'data-front-screen-toggle';

/**
 * The switch in the contact corner. The Kernel owns which paper the page is
 * printed on; this owns the button that asks it to change.
 *
 * It writes `aria-checked` and nothing else: the visible word and the pill's
 * position are the stylesheet's, off `data-theme`, so both are right at first
 * paint whether or not this module ever arrives. NOTES.md.
 */
export function mountThemeToggle(root: ParentNode = document): void {
  const button = root.querySelector<HTMLButtonElement>(`[${TOGGLE}]`);
  if (!button) return;

  const reflect = (): void => {
    button.setAttribute('aria-checked', theme() === 'dark' ? 'true' : 'false');
  };

  reflect();
  // Whoever changed it: this button, or the system preference the Kernel follows
  // until the reader has chosen.
  onThemeChange(reflect);
  button.addEventListener('click', () => {
    toggleTheme();
  });
}
