'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiRefreshCw } from 'react-icons/fi';

type Props = {
  classId: string;
  locale: 'en' | 'ar';
  className?: string;
  onRenewed?: () => void;
  label?: string;
  loadingLabel?: string;
};

export default function AdminRenewClassButton({
  classId,
  locale,
  className,
  onRenewed,
  label,
  loadingLabel,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const buttonLabel = label || (locale === 'ar' ? 'رينيـو الصف' : 'Renew Class');
  const buttonLoadingLabel = loadingLabel || (locale === 'ar' ? 'جاري إنشاء صف جديد...' : 'Creating new class...');

  async function renewClass() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/renew`, {
        method: 'POST',
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        class?: { id?: string };
      };

      if (!response.ok || !payload.class?.id) {
        throw new Error(payload.error || 'Failed to renew class.');
      }

      onRenewed?.();
      router.push(`/${locale}/admin/classes/${payload.class.id}/renew`);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to renew class.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void renewClass()}
      disabled={loading}
      className={className}
    >
      <FiRefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? buttonLoadingLabel : buttonLabel}
    </button>
  );
}