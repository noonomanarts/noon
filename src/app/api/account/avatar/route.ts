import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getUserById } from '@/lib/db/users';

const sanitizeFilename = (value: string) => value.replace(/[^a-z0-9.-_]/gi, '-').toLowerCase();

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be 5MB or less.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await mkdir(uploadDir, { recursive: true });

    const safeExt = path.extname(file.name) || '.jpg';
    const safeBase = sanitizeFilename(path.basename(file.name, safeExt)).slice(0, 60) || 'avatar';
    const finalName = `${currentUser.id}-${Date.now()}-${safeBase}${safeExt.toLowerCase()}`;
    const filePath = path.join(uploadDir, finalName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/profiles/${finalName}`,
    });
  } catch (error) {
    console.error('Failed to upload profile avatar:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
