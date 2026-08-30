/**
 * WebMCP surface compatibility.
 *
 * `use-webmcp-tool` (and most of the ecosystem) reads `document.modelContext`.
 * Some runtimes / polyfills only put it on `navigator.modelContext`. This bridges
 * whichever one exists onto the other, and keeps watching for a late injection
 * (browser extensions inject after `DOMContentLoaded`).
 *
 * Call once, as early as possible, before React mounts.
 */
export function installWebMCPCompat(): void {
  if (typeof document === 'undefined') return;

  const sync = () => {
    const fromDoc = document.modelContext;
    const fromNav = typeof navigator !== 'undefined' ? navigator.modelContext : undefined;

    if (fromDoc && !fromNav && typeof navigator !== 'undefined') {
      try {
        Object.defineProperty(navigator, 'modelContext', {
          value: fromDoc,
          configurable: true,
        });
      } catch {
        /* read-only navigator in some engines — non-fatal */
      }
    } else if (fromNav && !fromDoc) {
      try {
        Object.defineProperty(document, 'modelContext', {
          value: fromNav,
          configurable: true,
        });
      } catch {
        /* non-fatal */
      }
    }
    return Boolean(document.modelContext);
  };

  if (sync()) return;

  // Poll briefly for an extension / origin-trial injection, then give up quietly.
  let tries = 0;
  const timer = setInterval(() => {
    if (sync() || ++tries >= 40) clearInterval(timer);
  }, 250);
}

/** True when a WebMCP host is present in this browser right now. */
export function isWebMCPAvailable(): boolean {
  return typeof document !== 'undefined' && Boolean(document.modelContext);
}
