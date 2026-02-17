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

function pickAmount(data?: Record<string, unknown> | null): number | null {
  if (!data) return null;
  const value = data.amount;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickCurrency(data?: Record<string, unknown> | null): string {
  if (!data) return 'OMR';
  return getString(data.currency) ?? 'OMR';
}

export function formatNotificationContent(
  notification: NotificationInput,
  locale: Locale,
  options?: { compact?: boolean }
): { title: string; message: string } {
  const compact = options?.compact ?? false;
  const isArabic = locale === 'ar';

  const userName = pickUserName(notification.data);
  const amount = pickAmount(notification.data);
  const currency = pickCurrency(notification.data);

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

  if (notification.type === 'withdrawal_request_cancelled') {
    if (userName) {
      return {
        title: isArabic ? 'تم إلغاء طلب السحب' : 'Withdrawal Cancelled',
        message: isArabic
          ? compact
            ? `إلغاء سحب ${userName}`
            : `قام ${userName} بإلغاء طلب السحب.`
          : compact
            ? `${userName} cancelled withdrawal`
            : `${userName} cancelled the withdrawal request.`,
      };
    }

    return {
      title: isArabic ? 'تم إلغاء طلب السحب' : 'Withdrawal Cancelled',
      message: isArabic
        ? compact
          ? 'تم إلغاء طلب السحب'
          : 'تم إلغاء طلب السحب وإرجاع المبلغ المحجوز.'
        : compact
          ? 'Withdrawal cancelled'
          : 'Your withdrawal request was cancelled and held funds were restored.',
    };
  }

  if (notification.type === 'deposit_success') {
    return {
      title: isArabic ? 'تم الإيداع بنجاح' : 'Deposit Successful',
      message: isArabic
        ? amount !== null
          ? `تم إيداع ${amount.toFixed(3)} ${currency} في محفظتك.`
          : 'تم الإيداع في محفظتك بنجاح.'
        : amount !== null
          ? `${amount.toFixed(3)} ${currency} was deposited into your wallet.`
          : 'Your wallet deposit was completed successfully.',
    };
  }

  if (notification.type === 'transfer_sent') {
    return {
      title: isArabic ? 'تم إرسال تحويل' : 'Transfer Sent',
      message: isArabic
        ? amount !== null
          ? `تم تحويل ${amount.toFixed(3)} ${currency} بنجاح.`
          : 'تم إرسال التحويل من محفظتك بنجاح.'
        : amount !== null
          ? `${amount.toFixed(3)} ${currency} was sent from your wallet.`
          : 'Your wallet transfer was completed successfully.',
    };
  }

  if (notification.type === 'transfer_received') {
    return {
      title: isArabic ? 'تم استلام تحويل' : 'Transfer Received',
      message: isArabic
        ? amount !== null
          ? `تم استلام ${amount.toFixed(3)} ${currency} في محفظتك.`
          : 'تم استلام تحويل إلى محفظتك.'
        : amount !== null
          ? `You received ${amount.toFixed(3)} ${currency} in your wallet.`
          : 'You received a wallet transfer.',
    };
  }

  if (notification.type === 'admin_credit') {
    return {
      title: isArabic ? 'إضافة رصيد من الإدارة' : 'Wallet Credited',
      message: isArabic
        ? amount !== null
          ? `أضافت الإدارة ${amount.toFixed(3)} ${currency} إلى محفظتك.`
          : 'أضافت الإدارة رصيداً إلى محفظتك.'
        : amount !== null
          ? `Admin added ${amount.toFixed(3)} ${currency} to your wallet.`
          : 'An admin added credit to your wallet.',
    };
  }

  if (notification.type === 'admin_deduct') {
    return {
      title: isArabic ? 'خصم رصيد من الإدارة' : 'Wallet Deduction',
      message: isArabic
        ? amount !== null
          ? `خصمت الإدارة ${amount.toFixed(3)} ${currency} من محفظتك.`
          : 'خصمت الإدارة رصيداً من محفظتك.'
        : amount !== null
          ? `Admin deducted ${amount.toFixed(3)} ${currency} from your wallet.`
          : 'An admin deducted credit from your wallet.',
    };
  }

  if (notification.type === 'available_balance_updated') {
    const withdrawable = notification.data && typeof notification.data.withdrawableAmount === 'number'
      ? notification.data.withdrawableAmount
      : null;

    return {
      title: isArabic ? 'تحديث المقدار القابل للسحب' : 'Withdrawable Amount Updated',
      message: isArabic
        ? withdrawable !== null
          ? `تم تحديث المقدار القابل للسحب إلى ${withdrawable.toFixed(3)} ${currency}.`
          : 'تم تحديث المقدار القابل للسحب في محفظتك.'
        : withdrawable !== null
          ? `Your withdrawable amount is now ${withdrawable.toFixed(3)} ${currency}.`
          : 'Your withdrawable wallet amount was updated.',
    };
  }

  return {
    title: notification.title || (isArabic ? 'إشعار' : 'Notification'),
    message: notification.message || '',
  };
}
