"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ShopProduct } from "@/lib/db/types";
import { FiPrinter, FiSearch, FiPlus, FiMinus, FiX, FiTag } from "react-icons/fi";

type ProductForLabel = Pick<ShopProduct, "id" | "name_en" | "name_ar" | "sku" | "price" | "currency" | "stock_quantity" | "image"> & {
  latest_expiry_date: Date | string | null;
  latest_production_date: Date | string | null;
};

interface Props {
  locale: string;
  products: ProductForLabel[];
}

interface LabelItem {
  product: ProductForLabel;
  quantity: number;
}

interface LabelSettings {
  widthMm: number;
  heightMm: number;
  paddingMm: number;
  gapMm: number;
  fontScale: number;
  pageMode: "single" | "sheet";
  showDates: boolean;
  showSku: boolean;
  showPrice: boolean;
  showSecondaryLanguage: boolean;
}

interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  isCustom?: boolean;
}

interface PrintPreferencesPayload {
  settings?: Partial<LabelSettings>;
  customPresets?: LabelPreset[];
}

const SETTINGS_STORAGE_KEY = "noon.worker.print-label.settings.v1";
const PRESETS_STORAGE_KEY = "noon.worker.print-label.custom-presets.v1";
const PREFERENCES_API = "/api/worker/print/preferences";

const DEFAULT_PRESETS: LabelPreset[] = [
  { id: "58x38", name: "58x38", widthMm: 58, heightMm: 38 },
  { id: "50x30", name: "50x30", widthMm: 50, heightMm: 30 },
  { id: "60x40", name: "60x40", widthMm: 60, heightMm: 40 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function sanitizeSettings(input: Partial<LabelSettings> | null | undefined): LabelSettings {
  return {
    widthMm: clamp(Number(input?.widthMm ?? 58), 20, 120),
    heightMm: clamp(Number(input?.heightMm ?? 38), 20, 120),
    paddingMm: clamp(Number(input?.paddingMm ?? 2.5), 0, 8),
    gapMm: clamp(Number(input?.gapMm ?? 0), 0, 10),
    fontScale: clamp(Number(input?.fontScale ?? 100), 70, 130),
    pageMode: input?.pageMode === "sheet" ? "sheet" : "single",
    showDates: input?.showDates ?? true,
    showSku: input?.showSku ?? true,
    showPrice: input?.showPrice ?? true,
    showSecondaryLanguage: input?.showSecondaryLanguage ?? true,
  };
}

function sanitizePresets(input: unknown): LabelPreset[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((preset) => typeof preset === "object" && preset !== null)
    .map((preset) => {
      const raw = preset as Partial<LabelPreset>;
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      if (!name) return null;
      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id : crypto.randomUUID(),
        name,
        widthMm: clamp(Number(raw.widthMm), 20, 120),
        heightMm: clamp(Number(raw.heightMm), 20, 120),
        isCustom: true,
      } as LabelPreset;
    })
    .filter((preset): preset is LabelPreset => Boolean(preset));
}

export default function PrintLabelsClient({ locale, products }: Props) {
  const isArabic = locale === "ar";
  const [search, setSearch] = useState("");
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [settings, setSettings] = useState<LabelSettings>({
    widthMm: 58,
    heightMm: 38,
    paddingMm: 2.5,
    gapMm: 0,
    fontScale: 100,
    pageMode: "single",
    showDates: true,
    showSku: true,
    showPrice: true,
    showSecondaryLanguage: true,
  });
  const [customPresets, setCustomPresets] = useState<LabelPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const presets: LabelPreset[] = [...DEFAULT_PRESETS, ...customPresets];

  const t = useMemo(
    () => ({
      title: isArabic ? "طباعة الملصقات" : "Print Labels",
      searchPlaceholder: isArabic ? "ابحث عن منتج..." : "Search products...",
      addToQueue: isArabic ? "إضافة" : "Add",
      labelQueue: isArabic ? "قائمة الطباعة" : "Label Queue",
      noItems: isArabic ? "لا توجد ملصقات للطباعة" : "No labels in queue",
      preview: isArabic ? "معاينة" : "Preview",
      print: isArabic ? "طباعة" : "Print",
      clear: isArabic ? "مسح الكل" : "Clear All",
      labels: isArabic ? "ملصق" : "labels",
      currency: isArabic ? "ر.ع" : "OMR",
      sku: isArabic ? "رمز المنتج" : "SKU",
      productionDate: isArabic ? "تاريخ الإنتاج" : "Production",
      expiryDate: isArabic ? "تاريخ الانتهاء" : "Expiry",
      noDate: isArabic ? "غير متوفر" : "N/A",
      back: isArabic ? "رجوع" : "Back",
      close: isArabic ? "إغلاق" : "Close",
      printSettings: isArabic ? "إعدادات الطباعة" : "Print Settings",
      stickerSize: isArabic ? "حجم الملصق (مم)" : "Sticker size (mm)",
      presets: isArabic ? "مقاسات جاهزة" : "Presets",
      width: isArabic ? "العرض" : "Width",
      height: isArabic ? "الارتفاع" : "Height",
      pageMode: isArabic ? "نمط الصفحة" : "Page mode",
      singleLabelPage: isArabic ? "ملصق واحد لكل صفحة" : "Single label per page",
      sheetMode: isArabic ? "عدة ملصقات في الصفحة" : "Multiple labels on a sheet",
      spacing: isArabic ? "المسافة بين الملصقات (مم)" : "Label spacing (mm)",
      padding: isArabic ? "الحشوة الداخلية (مم)" : "Inner padding (mm)",
      fontScale: isArabic ? "تكبير النص (%)" : "Font scale (%)",
      visibleFields: isArabic ? "العناصر الظاهرة" : "Visible fields",
      presetName: isArabic ? "اسم المقاس" : "Preset name",
      saveCurrentPreset: isArabic ? "حفظ المقاس الحالي" : "Save current size",
      removePreset: isArabic ? "حذف المقاس" : "Remove preset",
      showDates: isArabic ? "تاريخ الإنتاج والانتهاء" : "Production and expiry dates",
      showSku: isArabic ? "رمز المنتج" : "Product SKU",
      showPrice: isArabic ? "السعر" : "Price",
      showSecondaryLanguage: isArabic ? "اللغة الثانية" : "Secondary language",
      resetDefaults: isArabic ? "استعادة الافتراضي" : "Reset defaults",
      syncSaving: isArabic ? "جاري الحفظ..." : "Saving...",
      syncSaved: isArabic ? "تم الحفظ" : "Saved",
      syncError: isArabic ? "تعذر المزامنة (تم الحفظ محليًا)" : "Sync failed (saved locally)",
      syncRetry: isArabic ? "إعادة المحاولة" : "Retry",
      printHintSingle: isArabic
        ? "لأفضل نتيجة: المقياس 100%، الهوامش None، وحجم الورق مطابق لحجم الملصق"
        : "Best result: Scale 100%, Margins None, and paper size exactly matches sticker size",
      printHintSheet: isArabic
        ? "لطباعة عدة ملصقات: اختر A4 أو ورق مخصص وأبقِ المقياس 100%"
        : "For multi-label sheets: use A4 or your sheet paper size and keep Scale 100%",
    }),
    [isArabic]
  );

  const updateNumberSetting = (key: keyof LabelSettings, value: number, min: number, max: number) => {
    setSettings((prev) => ({ ...prev, [key]: clamp(value, min, max) }));
  };

  useEffect(() => {
    try {
      const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as Partial<LabelSettings>;
        setSettings(sanitizeSettings(parsed));
      }

      const rawPresets = window.localStorage.getItem(PRESETS_STORAGE_KEY);
      if (rawPresets) {
        const parsed = JSON.parse(rawPresets) as unknown;
        setCustomPresets(sanitizePresets(parsed));
      }
    } catch {
      // Ignore invalid local storage values and fallback to defaults.
    }

    let cancelled = false;
    const loadFromServer = async () => {
      try {
        const response = await fetch(PREFERENCES_API, { method: "GET", cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PrintPreferencesPayload;
        if (cancelled) return;

        if (payload.settings) {
          const nextSettings = sanitizeSettings(payload.settings);
          setSettings(nextSettings);
          window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        }

        if (payload.customPresets) {
          const nextPresets = sanitizePresets(payload.customPresets);
          setCustomPresets(nextPresets);
          window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
        }
      } catch {
        // Keep local fallback when remote sync is unavailable.
      } finally {
        if (!cancelled) setPreferencesReady(true);
      }
    };

    void loadFromServer();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [preferencesReady, settings]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
  }, [customPresets, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;

    const syncNow = async () => {
      setSyncStatus("saving");
      try {
        const response = await fetch(PREFERENCES_API, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings, customPresets }),
        });

        if (!response.ok) {
          throw new Error("sync_failed");
        }

        setSyncStatus("saved");
        window.setTimeout(() => setSyncStatus("idle"), 1500);
      } catch {
        // localStorage fallback still works if sync fails.
        setSyncStatus("error");
      }
    };

    const timeoutId = window.setTimeout(() => {
      void syncNow();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [customPresets, preferencesReady, settings]);

  const resetDefaults = () => {
    setSettings({
      widthMm: 58,
      heightMm: 38,
      paddingMm: 2.5,
      gapMm: 0,
      fontScale: 100,
      pageMode: "single",
      showDates: true,
      showSku: true,
      showPrice: true,
      showSecondaryLanguage: true,
    });
  };

  const applyPreset = (preset: LabelPreset) => {
    setSettings((prev) => ({
      ...prev,
      widthMm: preset.widthMm,
      heightMm: preset.heightMm,
    }));
  };

  const addCustomPreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    setCustomPresets((prev) => {
      const duplicateIndex = prev.findIndex((item) => item.name.toLowerCase() === name.toLowerCase());
      const nextPreset: LabelPreset = {
        id: duplicateIndex >= 0 ? prev[duplicateIndex].id : crypto.randomUUID(),
        name,
        widthMm: settings.widthMm,
        heightMm: settings.heightMm,
        isCustom: true,
      };
      if (duplicateIndex >= 0) {
        return prev.map((item, idx) => (idx === duplicateIndex ? nextPreset : item));
      }
      return [...prev, nextPreset];
    });
    setNewPresetName("");
  };

  const removeCustomPreset = (id: string) => {
    setCustomPresets((prev) => prev.filter((item) => item.id !== id));
  };

  const retrySync = async () => {
    setSyncStatus("saving");
    try {
      const response = await fetch(PREFERENCES_API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings, customPresets }),
      });
      if (!response.ok) throw new Error("sync_failed");
      setSyncStatus("saved");
      window.setTimeout(() => setSyncStatus("idle"), 1500);
    } catch {
      setSyncStatus("error");
    }
  };

  const formatLabelDate = (value: Date | string | null) => {
    if (!value) return t.noDate;
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return t.noDate;
    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: 'Asia/Muscat',
    }).format(date);
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 20);
    const s = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name_en.toLowerCase().includes(s) ||
        p.name_ar.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s))
    );
  }, [products, search]);

  const addProduct = (product: ProductForLabel) => {
    setLabelItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setLabelItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setLabelItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalLabels = labelItems.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (showPreview) {
    return (
      <div className="print-preview-root min-h-screen bg-white p-4">
        {/* Print Controls */}
        <div className="mb-4 flex justify-center gap-4 print:hidden">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300"
          >
            {t.back}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <FiPrinter className="h-4 w-4" />
            {t.print}
          </button>
        </div>
        <p className="mb-4 text-center text-xs text-zinc-500 print:hidden">
          {settings.pageMode === "single" ? t.printHintSingle : t.printHintSheet}
        </p>

        {/* Labels Grid */}
        <div className="label-grid flex flex-wrap gap-2 print:gap-0">
          {labelItems.flatMap((item) =>
            Array.from({ length: item.quantity }).map((_, i) => (
              <div
                key={`${item.product.id}-${i}`}
                className="label flex flex-col justify-between border border-zinc-300 p-2 print:border-0"
                dir={isArabic ? "rtl" : "ltr"}
                style={{
                  width: `${settings.widthMm}mm`,
                  height: `${settings.heightMm}mm`,
                  padding: `${settings.paddingMm}mm`,
                }}
              >
                <div className="space-y-1 text-center">
                  <p className="text-[11px] font-bold leading-tight">
                    {isArabic ? item.product.name_ar : item.product.name_en}
                  </p>
                  {settings.showSecondaryLanguage && !isArabic && item.product.name_ar && (
                    <p className="text-[10px] text-zinc-500">{item.product.name_ar}</p>
                  )}
                  {settings.showSecondaryLanguage && isArabic && item.product.name_en && (
                    <p className="text-[10px] text-zinc-500">{item.product.name_en}</p>
                  )}
                </div>
                <div className="space-y-1">
                  {settings.showDates && (
                    <div className="space-y-0.5 text-[9px] leading-tight text-zinc-700">
                      <p className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{t.productionDate}</span>
                        <span>{formatLabelDate(item.product.latest_production_date)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{t.expiryDate}</span>
                        <span>{formatLabelDate(item.product.latest_expiry_date)}</span>
                      </p>
                    </div>
                  )}
                  {(settings.showSku || settings.showPrice) && (
                    <div className="flex items-end justify-between gap-2 border-t border-zinc-200 pt-1">
                      {settings.showSku && item.product.sku ? (
                        <span className="text-[8px] text-zinc-400">{item.product.sku}</span>
                      ) : (
                        <span />
                      )}
                      {settings.showPrice && (
                        <span className="text-sm font-bold">
                          {item.product.price.toFixed(3)} {item.product.currency}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @page {
            size: ${settings.pageMode === "single" ? `${settings.widthMm}mm ${settings.heightMm}mm` : "A4 portrait"};
            margin: ${settings.pageMode === "single" ? "0" : "8mm"};
          }

          @media print {
            html,
            body {
              width: ${settings.pageMode === "single" ? `${settings.widthMm}mm` : "auto"};
              height: ${settings.pageMode === "single" ? `${settings.heightMm}mm` : "auto"};
              margin: 0 !important;
              padding: 0 !important;
              background: #fff;
              overflow: visible !important;
            }

            .print-preview-root {
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            body * {
              visibility: hidden;
            }

            .label-grid,
            .label-grid * {
              visibility: visible;
            }

            .label-grid {
              position: ${settings.pageMode === "single" ? "absolute" : "static"};
              left: 0;
              top: 0;
              display: flex;
              flex-wrap: wrap;
              width: ${settings.pageMode === "single" ? `${settings.widthMm}mm` : "auto"};
              margin: 0;
              padding: 0;
              gap: ${settings.gapMm}mm;
            }

            .label {
              width: ${settings.widthMm}mm !important;
              height: ${settings.heightMm}mm !important;
              margin: 0 !important;
              border: 0 !important;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: ${settings.pageMode === "single" ? "always" : "auto"};
              break-after: ${settings.pageMode === "single" ? "page" : "auto"};
              overflow: hidden;
              box-sizing: border-box;
              padding: ${settings.paddingMm}mm;
            }

            .label:last-child {
              page-break-after: auto;
              break-after: auto;
            }

            .print\:hidden {
              display: none !important;
            }

            .dark,
            .dark * {
              color-scheme: light;
            }

            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .label p,
            .label span {
              color: #111827 !important;
            }

            .label .text-zinc-500,
            .label .text-zinc-400,
            .label .text-zinc-700 {
              color: #374151 !important;
            }

            .label .border-zinc-200 {
              border-color: #e5e7eb !important;
            }

            .label .text-sm {
              font-size: ${(14 * settings.fontScale) / 100}px !important;
            }

            .label .text-\[11px\] {
              font-size: ${(11 * settings.fontScale) / 100}px !important;
            }

            .label .text-\[10px\] {
              font-size: ${(10 * settings.fontScale) / 100}px !important;
            }

            .label .text-\[9px\] {
              font-size: ${(9 * settings.fontScale) / 100}px !important;
            }

            .label .text-\[8px\] {
              font-size: ${(8 * settings.fontScale) / 100}px !important;
            }

            .label .border-t {
              border-top-width: 1px;
            }

            .label * {
              page-break-inside: avoid;
            }

            .label p,
            .label span {
              line-height: 1.2 !important;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Search */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative mb-4">
            <FiSearch className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pe-4 ps-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  {product.image ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-zinc-200">
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700">
                      <FiTag className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {isArabic ? product.name_ar : product.name_en}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {product.price.toFixed(3)} {product.currency}
                      {product.sku && ` • ${product.sku}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  <FiPlus className="h-3 w-3" />
                  {t.addToQueue}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Label Queue */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.labelQueue}</h2>
            {labelItems.length > 0 && (
              <button
                type="button"
                onClick={() => setLabelItems([])}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                {t.clear}
              </button>
            )}
          </div>

          {labelItems.length === 0 ? (
            <div className="py-12 text-center">
              <FiTag className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noItems}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 max-h-[300px] space-y-2 overflow-y-auto">
                {labelItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {isArabic ? item.product.name_ar : item.product.name_en}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.product.price.toFixed(3)} {item.product.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      >
                        <FiMinus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-zinc-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      >
                        <FiPlus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="ms-2 flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.printSettings}</h3>
                  <div className="flex items-center gap-3">
                    {syncStatus !== "idle" && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs ${
                          syncStatus === "saved"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : syncStatus === "saving"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {syncStatus === "saving"
                            ? t.syncSaving
                            : syncStatus === "saved"
                              ? t.syncSaved
                              : t.syncError}
                        </span>
                        {syncStatus === "error" && (
                          <button
                            type="button"
                            onClick={() => void retrySync()}
                            className="rounded border border-red-300 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            {t.syncRetry}
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={resetDefaults}
                      className="text-xs text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-300"
                    >
                      {t.resetDefaults}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-1 text-xs text-zinc-600 dark:text-zinc-300">{t.presets}</p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => {
                      const active = settings.widthMm === preset.widthMm && settings.heightMm === preset.heightMm;
                      return (
                        <div key={preset.id} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className={`rounded-md border px-2.5 py-1 text-xs ${
                              active
                                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {preset.name} ({preset.widthMm}x{preset.heightMm} mm)
                          </button>
                          {preset.isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomPreset(preset.id)}
                              className="rounded border border-red-300 px-1.5 py-1 text-[10px] text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                              aria-label={t.removePreset}
                              title={t.removePreset}
                            >
                              <FiX className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder={t.presetName}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addCustomPreset}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    {t.saveCurrentPreset}
                  </button>
                </div>

                <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-300">{t.stickerSize}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{t.width}</span>
                    <input
                      type="number"
                      min={20}
                      max={120}
                      step={1}
                      value={settings.widthMm}
                      onChange={(e) => updateNumberSetting("widthMm", Number(e.target.value || 0), 20, 120)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{t.height}</span>
                    <input
                      type="number"
                      min={20}
                      max={120}
                      step={1}
                      value={settings.heightMm}
                      onChange={(e) => updateNumberSetting("heightMm", Number(e.target.value || 0), 20, 120)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{t.padding}</span>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      step={0.5}
                      value={settings.paddingMm}
                      onChange={(e) => updateNumberSetting("paddingMm", Number(e.target.value || 0), 0, 8)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{t.spacing}</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={settings.gapMm}
                      onChange={(e) => updateNumberSetting("gapMm", Number(e.target.value || 0), 0, 10)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{t.fontScale}</span>
                    <input
                      type="number"
                      min={70}
                      max={130}
                      step={5}
                      value={settings.fontScale}
                      onChange={(e) => updateNumberSetting("fontScale", Number(e.target.value || 0), 70, 130)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{t.pageMode}</span>
                    <select
                      value={settings.pageMode}
                      onChange={(e) => setSettings((prev) => ({ ...prev, pageMode: e.target.value as LabelSettings["pageMode"] }))}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    >
                      <option value="single">{t.singleLabelPage}</option>
                      <option value="sheet">{t.sheetMode}</option>
                    </select>
                  </label>
                </div>

                <p className="mt-3 mb-1 text-xs text-zinc-600 dark:text-zinc-300">{t.visibleFields}</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={settings.showDates}
                      onChange={(e) => setSettings((prev) => ({ ...prev, showDates: e.target.checked }))}
                    />
                    <span>{t.showDates}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={settings.showSku}
                      onChange={(e) => setSettings((prev) => ({ ...prev, showSku: e.target.checked }))}
                    />
                    <span>{t.showSku}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={settings.showPrice}
                      onChange={(e) => setSettings((prev) => ({ ...prev, showPrice: e.target.checked }))}
                    />
                    <span>{t.showPrice}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={settings.showSecondaryLanguage}
                      onChange={(e) => setSettings((prev) => ({ ...prev, showSecondaryLanguage: e.target.checked }))}
                    />
                    <span>{t.showSecondaryLanguage}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {totalLabels} {t.labels}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  >
                    {t.preview}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    <FiPrinter className="h-4 w-4" />
                    {t.print}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
