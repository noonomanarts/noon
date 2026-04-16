export function getPaymentMethodLabel(method: string | null | undefined, locale: string) {
  const isArabic = locale === 'ar';

  switch (method) {
    case 'WALLET':
      return isArabic ? 'خصم من المحفظة' : 'Cut from wallet';
    case 'CASH':
      return isArabic ? 'دفع نقدي' : 'Paid cash';
    case 'ONLINE':
      return isArabic ? 'دفع عبر الفيزا' : 'Paid via Visa';
    case 'BANK_TRANSFER':
      return isArabic ? 'دفع عبر التحويل' : 'Paid via transaction';
    default:
      return method || (isArabic ? 'غير محدد' : 'Not set');
  }
}