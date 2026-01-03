export default function ThemeInitScript() {
  // Runs before React hydration to prevent "flash" when switching themes.
  const code = `(() => {
  const storageKey = 'noon-theme';
  const stored = (() => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  })();

  /** @type {'light'|'dark'|'system'} */
  const preference = stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';

  const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  const systemDark = !!(mql && mql.matches);
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
