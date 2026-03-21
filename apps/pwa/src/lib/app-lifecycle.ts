/**
 * App lifecycle management for Capacitor native builds.
 *
 * Provides a shared AbortController that is aborted when the app goes to
 * background and recreated on foreground. Streaming operations (chat, onboarding)
 * can use `getActiveSignal()` to get an AbortSignal that cancels when the app
 * backgrounds.
 */

let activeController = new AbortController();

/** Get an AbortSignal that fires when the app backgrounds. */
export function getActiveSignal(): AbortSignal {
  return activeController.signal;
}

/** Abort in-flight operations (called on app background). */
export function abortActiveOperations(): void {
  activeController.abort();
}

/** Create a fresh AbortController (called on app resume). */
export function resetActiveOperations(): void {
  if (!activeController.signal.aborted) return;
  activeController = new AbortController();
}
