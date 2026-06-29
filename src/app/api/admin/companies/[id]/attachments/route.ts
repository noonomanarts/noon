import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { requireAdminApi } from '../../_auth';
import { getUploadRootDir } from '@/lib/uploadStorage';
import { addCompanyAttachment, deleteCompanyAttachment, getCompanyOrder } from '@/lib/db/companies';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const order = await getCompanyOrder(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'File required' }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File must be 20MB or less' }, { status: 400 });

  const dir = path.join(getUploadRootDir(), 'company-attachments');
  await mkdir(dir, { recursive: true });
  const ext = path.extname(file.name) || '.bin';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  const url = `/uploads/company-attachments/${fileName}`;

  await addCompanyAttachment(id, url, file.name, admin.id);
  return NextResponse.json({ order: await getCompanyOrder(id) });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const attachmentId = new URL(request.url).searchParams.get('attachmentId');
  if (!attachmentId) return NextResponse.json({ error: 'attachmentId required' }, { status: 400 });
  await deleteCompanyAttachment(id, attachmentId);
  return NextResponse.json({ order: await getCompanyOrder(id) });
}
