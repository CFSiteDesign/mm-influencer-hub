import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { isIframed, STANDALONE_URL, openBreakout } from '@/lib/iframe-utils';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = '__mm_iframe_banner_dismissed__';

/**
 * Floating banner shown only when the app is loaded inside an iframe.
 * Gives users a one-tap escape hatch to open the form standalone — critical
 * for Instagram in-app browsers where third-party iframe storage is blocked.
 */
export function IframeEscapeHatch() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIframed()) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      dismissed = false;
    }
    if (!dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-primary text-primary-foreground shadow-md">
      <div className="max-w-2xl mx-auto px-3 py-2 flex items-center gap-2">
        <p className="text-xs sm:text-sm flex-1 leading-snug">
          For the best experience, open this form in your browser.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-3 text-xs gap-1 shrink-0"
          onClick={() => openBreakout(STANDALONE_URL)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-primary-foreground/10 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
