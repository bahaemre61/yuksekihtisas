import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import EvidenceSession from '@/src/lib/models/EvidenceSession';
import Evidence from '@/src/lib/models/Evidence';
import User, { UserRole } from '@/src/lib/models/User';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const file = formData.get('file') as File | null;

    if (!sessionId || !title || !file) {
      return NextResponse.json({ msg: 'Eksik bilgi: Oturum, Başlık ve Dosya zorunludur.' }, { status: 400 });
    }

    await connectToDatabase();

    const session = await EvidenceSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ msg: 'Veri Oturumu bulunamadı.' }, { status: 404 });
    }

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isCreator = session.createdBy.toString() === user.id;
    const isReporter = session.reporters.some((r: any) => r.toString() === user.id);
    const isDataEntry = session.dataEntryUsers.some((u: any) => u.toString() === user.id);

    if (!isAdmin && !isCreator && !isReporter && !isDataEntry) {
      return NextResponse.json({ msg: 'Bu oturuma kanıt yükleme yetkiniz bulunmamaktadır.' }, { status: 403 });
    }

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

    const fileUrl = `/api/display-image/${safeFilename}`;

    const newEvidence = await Evidence.create({
      sessionId,
      title: title.trim(),
      description: description.trim(),
      fileUrl,
      fileName: file.name,
      fileType: file.type || ext,
      fileSize: file.size,
      uploadedBy: user.id,
      status: 'pending'
    });

    const populatedEvidence = await Evidence.findById(newEvidence._id)
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    return NextResponse.json(populatedEvidence, { status: 201 });
  } catch (err: any) {
    console.error('Evidence Upload Error:', err);
    return NextResponse.json({ msg: 'Kanıt yüklenemedi', error: err.message }, { status: 500 });
  }
}
