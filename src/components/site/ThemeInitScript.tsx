export default function ThemeInitScript() {
  // Runs before React hydration to enforce light mode consistently.
  const code = `(() => {
  const storageKey = 'noon-theme';
  const root = document.documentElement;
  root.classList.remove('dark');
  root.dataset.theme = 'light';
  root.dataset.themePreference = 'light';
  try { localStorage.setItem(storageKey, 'light'); } catch {}
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
