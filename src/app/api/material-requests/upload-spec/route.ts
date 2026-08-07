import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { getAuthenticatedUser } from '@/src/lib/auth';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ msg: 'Lütfen yüklenecek Şartname dosyasını seçiniz.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ msg: 'Şartname dosyası maksimum 25MB olabilir.' }, { status: 400 });
    }

    const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.name).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { msg: 'Şartname sadece PDF (.pdf) veya Word (.doc, .docx) formatında yüklenebilir.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFilename = `spec-${Date.now()}-${path.basename(file.name).replaceAll(/[^a-zA-Z0-9._-]/g, '')}`;

    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

    const filePath = path.join(uploadDir, safeFilename);
    await writeFile(filePath, buffer);

    const fileUrl = `/api/display-image/${safeFilename}`;

    return NextResponse.json(
      {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        ext
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Specification Upload Error:', err);
    return NextResponse.json({ msg: 'Şartname dosyası yüklenemedi', error: err.message }, { status: 500 });
  }
}
