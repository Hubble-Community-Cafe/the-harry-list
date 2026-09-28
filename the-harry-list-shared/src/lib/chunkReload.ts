/** A second chunk failure within this window means the build itself is broken, not the tab stale. */
const RELOAD_GUARD_MS = 10_000;
const RELOAD_KEY = 'chunkReloadAt';

type ReloadTarget = Pick<Window, 'addEventListener' | 'sessionStorage' | 'location'>;

/**
 * Pages and widgets that load on demand live in separate files named after their content hash. A
 * tab opened before a deploy still asks for the previous build's files, which no longer exist, so
 * loading one fails. Vite reports that as a `vite:preloadError` event: reload once to fetch the new
 * build. If loading fails again right after that reload, the build is broken rather than the tab
 * stale, so the error is let through to the error screen instead of reloading in a loop.
 */
export function installChunkReload(target: ReloadTarget = window): void {
  target.addEventListener('vite:preloadError', (event) => {
    const lastReload = Number(target.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - lastReload < RELOAD_GUARD_MS) return;
    target.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    event.preventDefault();
    target.location.reload();
  });
}
