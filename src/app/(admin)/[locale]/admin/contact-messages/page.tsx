import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findContactMessages } from "@/lib/db/contacts";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";

export default async function AdminContactMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const currentUser = await getUserById(sessionId);
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const { messages } = await findContactMessages();

  const t = {
    title: locale === "ar" ? "رسائل التواصل" : "Contact Messages",
    empty:
      locale === "ar"
        ? "لا توجد رسائل حتى الآن"
        : "No messages yet",
    name: locale === "ar" ? "الاسم" : "Name",
    email: locale === "ar" ? "البريد" : "Email",
    phone: locale === "ar" ? "الهاتف" : "Phone",
    subject: locale === "ar" ? "الموضوع" : "Subject",
    message: locale === "ar" ? "الرسالة" : "Message",
    date: locale === "ar" ? "التاريخ" : "Date",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t.title}
        </h1>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t.empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {t.name}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {t.email}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {t.phone}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {t.subject}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {t.message}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {t.date}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {messages.map((msg) => (
                  <tr key={msg.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {msg.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {msg.email}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {msg.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {msg.subject}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      <div className="max-w-md whitespace-pre-line">
                        {msg.message}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {new Date(msg.createdAt).toLocaleDateString(locale === "ar" ? "ar-OM" : "en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
