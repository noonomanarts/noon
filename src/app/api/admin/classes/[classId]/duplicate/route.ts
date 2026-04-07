import { NextRequest, NextResponse } from 'next/server';
import { createClass, findUniqueClass } from '@/lib/db/classes';

type Params = {
  params: Promise<{ classId: string }>;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function buildUniqueSlug(baseTitle: string): Promise<string> {
  const base = slugify(baseTitle) || 'class-copy';
  for (let i = 1; i <= 200; i += 1) {
    const candidate = i === 1 ? `${base}-copy` : `${base}-copy-${i}`;
    const exists = await findUniqueClass({ slug: candidate });
    if (!exists) return candidate;
  }
  return `${base}-copy-${Date.now()}`;
}

export async function POST(_request: NextRequest, props: Params) {
  const { classId } = await props.params;

  try {
    const source = await findUniqueClass({ id: classId });
    if (!source) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (!source.trainerId || typeof source.trainerId !== 'string') {
      return NextResponse.json({ error: 'Cannot duplicate class without trainer' }, { status: 400 });
    }

    const sourceTitle = typeof source.title === 'string' ? source.title : 'Class';
    const sourceTitleAr = typeof source.titleAr === 'string' ? source.titleAr : null;
    const sourceDescription = typeof source.description === 'string' ? source.description : '';
    const sourceDescriptionAr = typeof source.descriptionAr === 'string' ? source.descriptionAr : null;
    const sourceCategory = source.category as 'COOKING' | 'ARTS_CRAFTS';
    const sourceSubCategory = source.subCategory as
      | 'APPETIZERS_SNACKS'
      | 'MAIN_DISHES'
      | 'DESSERTS_BAKING'
      | 'MOM_AND_KID'
      | 'PAINTING'
      | 'POTTERY'
      | 'CRAFTS'
      | 'MIXED';

    const duplicatedTitle = `${sourceTitle} (Copy)`;
    const duplicatedTitleAr = sourceTitleAr ? `${sourceTitleAr} (نسخة)` : undefined;
    const slug = await buildUniqueSlug(sourceTitle);

    const duplicated = await createClass({
      slug,
      title: duplicatedTitle,
      titleAr: duplicatedTitleAr,
      description: sourceDescription,
      descriptionAr: sourceDescriptionAr || undefined,
      category: sourceCategory,
      subCategory: sourceSubCategory,
      trainerId: source.trainerId,
      price: Number(source.price || 0),
      seatsTotal: Number(source.seatsTotal || 1),
      durationMinutes: Number(source.durationMinutes || 60),
      image: typeof source.image === 'string' ? source.image : undefined,
      images: Array.isArray(source.images) ? (source.images as string[]) : [],
      status: 'DRAFT',
      currency: (typeof source.currency === 'string' ? source.currency : 'OMR') as string,
      metaTitle: typeof source.metaTitle === 'string' ? source.metaTitle : undefined,
      metaDescription: typeof source.metaDescription === 'string' ? source.metaDescription : undefined,
      trainerSharePercent: Number(source.trainerSharePercent || 0),
      noonSharePercent: Number(source.noonSharePercent || 0),
      expenseSharePercent: Number(source.expenseSharePercent || 0),
    });

    return NextResponse.json({ success: true, class: duplicated }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating class:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to duplicate class' },
      { status: 500 }
    );
  }
}
