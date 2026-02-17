export type RecommendationProduct = {
  id: string;
  nameEn: string;
  nameAr: string;
  image: string;
  whyEn: string;
  whyAr: string;
  usedInClasses: boolean;
  buyLabelEn: string;
  buyLabelAr: string;
  buyUrl: string;
};

export type RecommendationPartner = {
  id: string;
  brandNameEn: string;
  brandNameAr: string;
  logo: string;
  websiteUrl: string;
  whyEn: string;
  whyAr: string;
  productPhotos: string[];
  freeRecipeTitleEn: string;
  freeRecipeTitleAr: string;
  freeRecipeBodyEn: string;
  freeRecipeBodyAr: string;
};

export type RecommendationCategory = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  products: RecommendationProduct[];
  partners: RecommendationPartner[];
};

export type NoonRecommendationsContent = {
  introImage: string;
  introTextEn: string;
  introTextAr: string;
  categories: RecommendationCategory[];
};

const store = new Map<string, NoonRecommendationsContent>();
const STORE_KEY = 'content:noon-recommends';

const DEFAULT_CONTENT: NoonRecommendationsContent = {
  introImage: '/og-image.png',
  introTextEn:
    'At Noon, every ingredient, tool, and brand we recommend has been tested in our kitchen and used in our classes. Noon Recommends is a selection of products we genuinely trust — chosen to help you cook better, smarter, and with confidence.',
  introTextAr:
    'في نون، كل مكوّن وأداة وعلامة نوصي بها تم اختبارها في مطبخنا واستخدامها في صفوفنا. نون يوصي هو اختيار من المنتجات التي نثق بها فعلاً — لمساعدتك على الطهي بشكل أفضل وبثقة أكبر.',
  categories: [
    {
      id: 'cat-pantry',
      nameEn: 'Pantry Essentials',
      nameAr: 'أساسيات المخزن',
      descriptionEn: 'Everyday staples we consistently rely on during classes.',
      descriptionAr: 'مكونات أساسية نعتمد عليها باستمرار خلال الدورات.',
      products: [
        {
          id: 'prod-pantry-1',
          nameEn: 'Premium Olive Oil',
          nameAr: 'زيت زيتون فاخر',
          image: '/og-image.png',
          whyEn: 'Balanced flavor and stable cooking performance.',
          whyAr: 'نكهة متوازنة وأداء ممتاز أثناء الطهي.',
          usedInClasses: true,
          buyLabelEn: 'Buy from Partner',
          buyLabelAr: 'اشترِ من الشريك',
          buyUrl: '#',
        },
      ],
      partners: [
        {
          id: 'partner-pantry-1',
          brandNameEn: 'Noon Partner Brand',
          brandNameAr: 'علامة شريك نون',
          logo: '/og-image.png',
          websiteUrl: '#',
          whyEn: 'Reliable ingredients with consistent quality and sourcing.',
          whyAr: 'مكونات موثوقة بجودة ثابتة ومصدر موثوق.',
          productPhotos: ['/og-image.png'],
          freeRecipeTitleEn: 'Free Recipe: Lemon Herb Marinade',
          freeRecipeTitleAr: 'وصفة مجانية: تتبيلة الليمون والأعشاب',
          freeRecipeBodyEn: 'Mix olive oil, lemon zest, minced garlic, and chopped parsley. Marinate protein for 30 minutes before cooking.',
          freeRecipeBodyAr: 'اخلط زيت الزيتون مع بشر الليمون والثوم المفروم والبقدونس. انقع المكونات لمدة 30 دقيقة قبل الطهي.',
        },
      ],
    },
    {
      id: 'cat-baking',
      nameEn: 'Baking & Pastry Tools',
      nameAr: 'أدوات الخَبز والحلويات',
      descriptionEn: 'Tools that support precision and repeatable baking results.',
      descriptionAr: 'أدوات تساعد على الدقة وتكرار نتائج الخَبز بنجاح.',
      products: [],
      partners: [],
    },
    {
      id: 'cat-cookware',
      nameEn: 'Cookware',
      nameAr: 'أدوات الطهي',
      descriptionEn: 'Durable cookware tested in active class environments.',
      descriptionAr: 'أدوات طهي متينة تم اختبارها في بيئة الدورات العملية.',
      products: [],
      partners: [],
    },
  ],
};

function cloneContent(content: NoonRecommendationsContent): NoonRecommendationsContent {
  return JSON.parse(JSON.stringify(content)) as NoonRecommendationsContent;
}

export function getNoonRecommendationsContent(): NoonRecommendationsContent {
  const fromStore = store.get(STORE_KEY);
  if (fromStore) {
    return cloneContent(fromStore);
  }

  store.set(STORE_KEY, cloneContent(DEFAULT_CONTENT));
  return cloneContent(DEFAULT_CONTENT);
}

export function updateNoonRecommendationsContent(
  input: NoonRecommendationsContent
): NoonRecommendationsContent {
  const sanitized: NoonRecommendationsContent = {
    introImage: input.introImage?.trim() || '/og-image.png',
    introTextEn: input.introTextEn?.trim() || DEFAULT_CONTENT.introTextEn,
    introTextAr: input.introTextAr?.trim() || DEFAULT_CONTENT.introTextAr,
    categories: Array.isArray(input.categories)
      ? input.categories.map((category) => ({
          id: category.id,
          nameEn: category.nameEn?.trim() || '',
          nameAr: category.nameAr?.trim() || '',
          descriptionEn: category.descriptionEn?.trim() || '',
          descriptionAr: category.descriptionAr?.trim() || '',
          products: Array.isArray(category.products)
            ? category.products.map((product) => ({
                id: product.id,
                nameEn: product.nameEn?.trim() || '',
                nameAr: product.nameAr?.trim() || '',
                image: product.image?.trim() || '',
                whyEn: product.whyEn?.trim() || '',
                whyAr: product.whyAr?.trim() || '',
                usedInClasses: Boolean(product.usedInClasses),
                buyLabelEn: product.buyLabelEn?.trim() || 'Buy from Partner',
                buyLabelAr: product.buyLabelAr?.trim() || 'اشترِ من الشريك',
                buyUrl: product.buyUrl?.trim() || '#',
              }))
            : [],
          partners: Array.isArray(category.partners)
            ? category.partners.map((partner) => ({
                id: partner.id,
                brandNameEn: partner.brandNameEn?.trim() || '',
                brandNameAr: partner.brandNameAr?.trim() || '',
                logo: partner.logo?.trim() || '',
                websiteUrl: partner.websiteUrl?.trim() || '#',
                whyEn: partner.whyEn?.trim() || '',
                whyAr: partner.whyAr?.trim() || '',
                productPhotos: Array.isArray(partner.productPhotos)
                  ? partner.productPhotos.map((photo) => photo.trim()).filter(Boolean)
                  : [],
                freeRecipeTitleEn: partner.freeRecipeTitleEn?.trim() || '',
                freeRecipeTitleAr: partner.freeRecipeTitleAr?.trim() || '',
                freeRecipeBodyEn: partner.freeRecipeBodyEn?.trim() || '',
                freeRecipeBodyAr: partner.freeRecipeBodyAr?.trim() || '',
              }))
            : [],
        }))
      : [],
  };

  store.set(STORE_KEY, cloneContent(sanitized));
  return cloneContent(sanitized);
}
