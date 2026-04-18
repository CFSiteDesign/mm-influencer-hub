/**
 * Utilities for detecting and handling being embedded in an iframe
 * (e.g. when a parent site embeds our apply form, and users reach it
 * via an Instagram link click).
 */

export function isIframed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent throws on access — that itself means we're iframed.
    return true;
  }
}

/**
 * Public URL where the form lives standalone. Used as the "open in new tab"
 * escape hatch when the iframe context is restrictive (Instagram IAB, etc.).
 */
export const STANDALONE_URL = 'https://mm-influencer-hub.lovable.app';

/**
 * Open a URL, breaking out of the iframe when possible. Falls back to
 * `window.open` in a new tab.
 */
export function openBreakout(url: string) {
  if (typeof window === 'undefined') return;
  try {
    // Try to navigate the top window first (works only if same-origin or
    // the parent allows it; usually blocked, in which case we catch).
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // Cross-origin — fall through to window.open
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
