import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getUserById } from '@/lib/db/users';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const PDF_TYPE = 'application/pdf';

function sanitizeExt(fileName: string, fallback: string): string {
  const ext = path.extname(fileName || '').toLowerCase();
  if (!ext) return fallback;
  if (!/^\.[a-z0-9]{1,8}$/i.test(ext)) return fallback;
  return ext;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isPdf = file.type === PDF_TYPE;

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Only image and PDF files are allowed' }, { status: 400 });
    }

    const maxSize = isPdf ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isPdf ? 'PDF size must be 20MB or less' : 'Image size must be 8MB or less' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'trainer-suggestions');
    await mkdir(uploadDir, { recursive: true });

    const fallbackExt = isPdf ? '.pdf' : '.jpg';
    const ext = sanitizeExt(file.name, fallbackExt);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, bytes);

    return NextResponse.json({
      url: `/uploads/trainer-suggestions/${fileName}`,
      type: isPdf ? 'PDF' : 'IMAGE',
    });
  } catch (error) {
    console.error('Trainer upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
