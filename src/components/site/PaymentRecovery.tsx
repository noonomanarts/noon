'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { retryUnconfirmedAmwalPayments } from '@/lib/amwalClient';

/**
 * Re-sends gateway results that could not be delivered right after paying
 * (connection dropped on the way back from the bank). Renders nothing.
 */
export default function PaymentRecovery() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      void retryUnconfirmedAmwalPayments()
        .then((recovered) => {
          if (!cancelled && recovered > 0) {
            router.refresh();
          }
        })
        .catch(() => undefined);
    };

    run();
    window.addEventListener('online', run);

    return () => {
      cancelled = true;
      window.removeEventListener('online', run);
    };
  }, [router]);

  return null;
}
