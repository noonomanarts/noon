import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";

const validCategories = ["cookware", "bakeware", "pantry", "ingredients", "tools"];

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale: rawLocale, category } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  if (!validCategories.includes(category)) {
    notFound();
  }

  const t = {
    categories: locale === "ar" ? "التصنيفات" : "Categories",
    products: locale === "ar" ? "المنتجات" : "Products",
    comingSoon: locale === "ar" ? "قريباً" : "Coming Soon",
    comingSoonDesc: locale === "ar" 
      ? "نعمل على إضافة منتجات رائعة في هذه الفئة"
      : "We're working on adding amazing products in this category",
    allProducts: locale === "ar" ? "جميع المنتجات" : "All Products",
    cookware: locale === "ar" ? "أدوات الطبخ" : "Cookware",
    bakeware: locale === "ar" ? "أدوات الخبز" : "Bakeware",
    pantry: locale === "ar" ? "البقالة" : "Pantry",
    ingredients: locale === "ar" ? "المكونات" : "Ingredients",
    tools: locale === "ar" ? "الأدوات" : "Tools & Gadgets",
  };

  const categoryNames: Record<string, string> = {
    cookware: t.cookware,
    bakeware: t.bakeware,
    pantry: t.pantry,
    ingredients: t.ingredients,
    tools: t.tools,
  };

  const categoryIcons: Record<string, string> = {
    cookware: "🍳",
    bakeware: "🧁",
    pantry: "🧂",
    ingredients: "🌾",
    tools: "🔪",
  };

  const categories = [
    { name: t.allProducts, slug: "", icon: "🛍️" },
    { name: t.cookware, slug: "cookware", icon: "🍳" },
    { name: t.bakeware, slug: "bakeware", icon: "🧁" },
    { name: t.pantry, slug: "pantry", icon: "🧂" },
    { name: t.ingredients, slug: "ingredients", icon: "🌾" },
    { name: t.tools, slug: "tools", icon: "🔪" },
  ];

  const categoryName = categoryNames[category];

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-12">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="sticky top-24">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.categories}
          </h2>
          <nav className="space-y-1">
            {categories.map((cat) => {
              const isActive = cat.slug === category;
              return (
                <Link
                  key={cat.slug}
                  href={cat.slug ? `/${locale}/shop/${cat.slug}` : `/${locale}/shop`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {categoryName}
          </h1>
        </div>

        {/* Coming Soon Message */}
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 text-6xl">{categoryIcons[category]}</div>
          <h2 className="mb-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {t.comingSoon}
          </h2>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            {t.comingSoonDesc}
          </p>
        </div>
      </main>
    </div>
  );
}
