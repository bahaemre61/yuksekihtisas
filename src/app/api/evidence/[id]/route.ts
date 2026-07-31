import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import Evidence from '@/src/lib/models/Evidence';
import User, { UserRole } from '@/src/lib/models/User';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return NextResponse.json({ msg: 'Kanıt kaydı bulunamadı.' }, { status: 404 });
    }

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isUploader = evidence.uploadedBy.toString() === user.id;
    const isAdmin = role === UserRole.ADMIN;

    if (!isUploader && !isAdmin) {
      return NextResponse.json({ msg: 'Bu kanıtı düzenleme yetkiniz yok.' }, { status: 403 });
    }

    // Sadece 'revision_requested' (veya 'pending') olan kanıtlar düzenlenebilir
    if (evidence.status !== 'revision_requested' && evidence.status !== 'pending') {
      return NextResponse.json({ msg: 'Sadece revizyon istenen kanıtlar düzenlenebilir.' }, { status: 400 });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const file = formData.get('file') as File | null;

    if (title && title.trim()) {
      evidence.title = title.trim();
    }
    if (description !== undefined) {
      evidence.description = description.trim();
    }

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ msg: 'Dosya boyutu maksimum 25MB olabilir.' }, { status: 400 });
      }

      const ALLOWED_EXTENSIONS = ['.doc', '.docx'];
      const ext = path.extname(file.name).toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { msg: 'Sadece Word (.doc, .docx) formatında dosyalar yüklenebilir.' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const safeFilename = `${Date.now()}-${path.basename(file.name).replaceAll(/[^a-zA-Z0-9._-]/g, '')}`;

      const uploadDir = path.join(process.cwd(), 'uploads');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch {}

      const filePath = path.join(uploadDir, safeFilename);
      await writeFile(filePath, buffer);

      evidence.fileUrl = `/api/display-image/${safeFilename}`;
      evidence.fileName = file.name;
      evidence.fileType = file.type || ext;
      evidence.fileSize = file.size;
    }

    // Düzenleme tamamlandığında durum tekrar 'pending' (beklemede) yapılır ki Raportör yeniden inceleyebilsin
    evidence.status = 'pending';
    await evidence.save();

    const updatedEvidence = await Evidence.findById(id)
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    return NextResponse.json(updatedEvidence);
  } catch (err: any) {
    console.error('Evidence Edit PUT Error:', err);
    return NextResponse.json({ msg: 'Kanıt güncellenemedi', error: err.message }, { status: 500 });
  }
}
