import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findContactMessages } from "@/lib/db/contacts";
import { getSessionUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import AdminContactMessagesPageClient from "@/components/admin/AdminContactMessagesPageClient";

export default async function AdminContactMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const currentUser = await getSessionUserById(sessionId);
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const { messages } = await findContactMessages();

  return (
    <AdminContactMessagesPageClient
      locale={locale}
      messages={messages.map((msg) => ({
        id: msg.id,
        name: msg.name,
        email: msg.email,
        phone: msg.phone,
        subject: msg.subject,
        message: msg.message,
        status: msg.status,
        createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt),
      }))}
    />
  );
}
