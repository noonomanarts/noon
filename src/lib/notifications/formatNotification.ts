import type { Locale } from '@/lib/locale';

type NotificationInput = {
  type: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown> | null;
};

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function pickUserName(data?: Record<string, unknown> | null): string | null {
  if (!data) return null;
  return getString(data.userName) ?? getString(data.user_full_name) ?? getString(data.fullName);
}

export function formatNotificationContent(
  notification: NotificationInput,
  locale: Locale,
  options?: { compact?: boolean }
): { title: string; message: string } {
  const compact = options?.compact ?? false;
  const isArabic = locale === 'ar';

  const userName = pickUserName(notification.data);

  if (notification.type === 'withdrawal_request_submitted') {
    if (userName) {
      return {
        title: isArabic ? 'طلب سحب جديد' : 'New Withdrawal Request',
        message: isArabic
          ? compact
            ? `طلب سحب من ${userName}`
            : `قام ${userName} بتقديم طلب سحب جديد.`
          : compact
            ? `${userName} requested withdrawal`
            : `${userName} submitted a new withdrawal request.`,
      };
    }

    return {
      title: isArabic ? 'تم إرسال طلب السحب' : 'Withdrawal Submitted',
      message: isArabic
        ? compact
          ? 'تم إرسال طلب السحب'
          : 'تم إرسال طلب السحب وهو بانتظار مراجعة الإدارة.'
        : compact
          ? 'Withdrawal submitted'
          : 'Your withdrawal request was submitted and is pending review.',
    };
  }

  if (notification.type === 'withdrawal_request_approved') {
    if (userName) {
      return {
        title: isArabic ? 'تمت الموافقة على السحب' : 'Withdrawal Approved',
        message: isArabic
          ? compact
            ? `موافقة على سحب ${userName}`
            : `تمت الموافقة على طلب سحب ${userName}.`
          : compact
            ? `${userName} withdrawal approved`
            : `${userName}'s withdrawal request was approved.`,
      };
    }

    return {
      title: isArabic ? 'تمت الموافقة على طلب السحب' : 'Withdrawal Approved',
      message: isArabic
        ? compact
          ? 'تمت الموافقة على طلب السحب'
          : 'تمت الموافقة على طلب السحب الخاص بك.'
        : compact
          ? 'Withdrawal approved'
          : 'Your withdrawal request was approved.',
    };
  }

  if (notification.type === 'withdrawal_request_rejected') {
    if (userName) {
      return {
        title: isArabic ? 'تم رفض طلب السحب' : 'Withdrawal Rejected',
        message: isArabic
          ? compact
            ? `رفض سحب ${userName}`
            : `تم رفض طلب سحب ${userName}.`
          : compact
            ? `${userName} withdrawal rejected`
            : `${userName}'s withdrawal request was rejected.`,
      };
    }

    return {
      title: isArabic ? 'تم رفض طلب السحب' : 'Withdrawal Rejected',
      message: isArabic
        ? compact
          ? 'تم رفض طلب السحب'
          : 'تم رفض طلب السحب الخاص بك وتم تحرير المبلغ المحجوز.'
        : compact
          ? 'Withdrawal rejected'
          : 'Your withdrawal request was rejected and held funds were released.',
    };
  }

  return {
    title: notification.title || (isArabic ? 'إشعار' : 'Notification'),
    message: notification.message || '',
  };
}
