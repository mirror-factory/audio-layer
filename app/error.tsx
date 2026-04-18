'use client';

/**
 * Next.js route-level error boundary. Catches errors thrown during render
 * of any page below this level. Logs the error to console and shows a
 * minimal recovery UI.
 *
 * This is separate from `global-error.tsx`, which catches errors in the
 * root layout itself.
 */

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route-error]', { name: error.name, message: error.message, digest: error.digest, stack: error.stack });
  }, [error]);

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h2>Something broke</h2>
      <p style={{ color: '#666' }}>The page failed to render. The error has been logged.</p>
      {error.digest && <p style={{ fontSize: '0.85rem', color: '#999' }}>Reference: {error.digest}</p>}
      <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Try again</button>
    </div>
  );
}
