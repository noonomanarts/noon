import { isLocale, type Locale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { getWalletByUserId, getWalletTransactions, getLoyaltyCardByUserId } from "@/lib/db/wallet";
import { getBookingsByUserId } from "@/lib/db/classes";
import { getEventBookingsByUserId } from "@/lib/db/events";
import { WalletSection } from "@/components/site/WalletSection";
import { OrdersSection } from "@/components/site/OrdersSection";
import { LoyaltySection } from "@/components/site/LoyaltySection";
import type { Booking, EventBooking } from "@/lib/db/types";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="text-center text-gray-500">
          {locale === "ar" ? "يرجى تسجيل الدخول لعرض هذه الصفحة" : "Please log in to view this page"}
        </p>
      </div>
    );
  }

  // Get wallet data
  let wallet = await getWalletByUserId(user.id);
  if (!wallet) {
    // Create wallet if doesn't exist
    wallet = {
      id: '',
      user_id: user.id,
      balance: 0,
      currency: 'OMR',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  const transactions = await getWalletTransactions(wallet.id);

  // Get loyalty data
  let loyalty = await getLoyaltyCardByUserId(user.id);
  if (!loyalty) {
    loyalty = {
      id: '',
      user_id: user.id,
      points: 0,
      stamps: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // Get orders
  const bookings = await getBookingsByUserId(user.id) as Booking[];
  const eventBookings = await getEventBookingsByUserId(user.id) as EventBooking[];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight mb-8">
        {locale === "ar" ? "حسابي" : "My Account"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wallet Section */}
        <WalletSection
          wallet={wallet}
          transactions={transactions}
          locale={locale}
        />

        {/* Loyalty Section */}
        <LoyaltySection
          loyalty={loyalty}
          locale={locale}
        />
      </div>

      {/* Orders Section */}
      <div className="mt-8">
        <OrdersSection
          bookings={bookings}
          eventBookings={eventBookings}
          locale={locale}
        />
      </div>
    </div>
  );
}
