"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { WorkerStats, WorkerPermissions } from "@/lib/db/types";
import { FiPackage, FiShoppingCart, FiTruck, FiPrinter, FiTrendingUp } from "react-icons/fi";

interface Props {
  locale: string;
  stats: WorkerStats;
  permissions: WorkerPermissions | null;
  userName: string;
}

export default function WorkerDashboardClient({ locale, stats, permissions, userName }: Props) {
  const isArabic = locale === "ar";

  const t = useMemo(
    () => ({
      welcome: isArabic ? `مرحبًا، ${userName}` : `Welcome, ${userName}`,
      dashboard: isArabic ? "لوحة التحكم" : "Dashboard",
      todayStats: isArabic ? "إحصائيات اليوم" : "Today's Stats",
      allTimeStats: isArabic ? "الإحصائيات الإجمالية" : "All-Time Stats",
      restocksToday: isArabic ? "إعادة التخزين اليوم" : "Restocks Today",
      salesToday: isArabic ? "المبيعات اليوم" : "Sales Today",
      totalRestocks: isArabic ? "إجمالي إعادة التخزين" : "Total Restocks",
      totalSales: isArabic ? "إجمالي المبيعات" : "Total Sales",
      totalRevenue: isArabic ? "إجمالي الإيرادات" : "Total Revenue",
      quickActions: isArabic ? "إجراءات سريعة" : "Quick Actions",
      addRestock: isArabic ? "إضافة مخزون" : "Add Restock",
      newSale: isArabic ? "بيع جديد" : "New Sale",
      viewOrders: isArabic ? "عرض الطلبات" : "View Orders",
      printLabels: isArabic ? "طباعة الملصقات" : "Print Labels",
      noPermissions: isArabic 
        ? "لم يتم منحك أي صلاحيات بعد. يرجى التواصل مع المسؤول." 
        : "You haven't been granted any permissions yet. Please contact your administrator.",
    }),
    [isArabic, userName]
  );

  const hasAnyPermission = permissions && (
    permissions.can_restock ||
    permissions.can_record_sales ||
    permissions.can_manage_orders ||
    permissions.can_print_labels ||
    permissions.can_print_bills
  );

  const quickActions = useMemo(() => {
    const actions: { label: string; href: string; icon: React.ReactNode; color: string; enabled: boolean }[] = [];
    
    if (permissions?.can_restock) {
      actions.push({
        label: t.addRestock,
        href: `/${locale}/worker/restock`,
        icon: <FiPackage className="h-6 w-6" />,
        color: "bg-emerald-500 hover:bg-emerald-600",
        enabled: true,
      });
    }
    
    if (permissions?.can_record_sales) {
      actions.push({
        label: t.newSale,
        href: `/${locale}/worker/sales/new`,
        icon: <FiShoppingCart className="h-6 w-6" />,
        color: "bg-amber-500 hover:bg-amber-600",
        enabled: true,
      });
    }
    
    if (permissions?.can_manage_orders) {
      actions.push({
        label: t.viewOrders,
        href: `/${locale}/worker/orders`,
        icon: <FiTruck className="h-6 w-6" />,
        color: "bg-blue-500 hover:bg-blue-600",
        enabled: true,
      });
    }
    
    if (permissions?.can_print_labels || permissions?.can_print_bills) {
      actions.push({
        label: t.printLabels,
        href: `/${locale}/worker/print`,
        icon: <FiPrinter className="h-6 w-6" />,
        color: "bg-purple-500 hover:bg-purple-600",
        enabled: true,
      });
    }
    
    return actions;
  }, [permissions, locale, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.welcome}</h1>
      </div>

      {!hasAnyPermission ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200">{t.noPermissions}</p>
        </div>
      ) : (
        <>
          {/* Today's Stats */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.todayStats}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {permissions?.can_restock && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <FiPackage className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.restocksToday}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.restocks_today}</p>
                    </div>
                  </div>
                </div>
              )}

              {permissions?.can_record_sales && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                      <FiShoppingCart className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.salesToday}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.sales_today}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All-Time Stats */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.allTimeStats}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {permissions?.can_restock && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <FiPackage className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.totalRestocks}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total_restocks}</p>
                    </div>
                  </div>
                </div>
              )}

              {permissions?.can_record_sales && (
                <>
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <FiShoppingCart className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.totalSales}</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total_sales}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <FiTrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.totalRevenue}</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {stats.total_sales_amount.toFixed(3)} OMR
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.quickActions}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`flex items-center gap-4 rounded-xl p-5 text-white transition-colors ${action.color}`}
                  >
                    {action.icon}
                    <span className="font-semibold">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
