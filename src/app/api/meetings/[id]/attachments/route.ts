import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { mkdir, writeFile, unlink } from 'fs/promises';
import connectToDatabase from '@/src/lib/db';
import Meeting from '@/src/lib/models/MeetingSchema';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { UserRole } from '@/src/lib/models/User';
import {
  MEETING_ALLOWED_EXT,
  MEETING_FILE_MAX_COUNT,
  MEETING_FILE_MAX_SIZE,
  MEETING_UPLOAD_DIR,
  matchesSignature,
} from '@/src/lib/meetingFiles';

// İstemciye dosyanın diskteki adı (storedName) verilmez
function publicAttachments(meeting: { attachments?: { _id?: unknown; originalName: string; size: number; mimeType: string; uploadedAt: Date }[] }) {
  return (meeting.attachments || []).map((a) => ({
    _id: String(a._id),
    originalName: a.originalName,
    size: a.size,
    mimeType: a.mimeType,
    uploadedAt: a.uploadedAt,
  }));
}

// Dosya yükle (yalnızca toplantıyı düzenleyen)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ msg: 'Geçersiz toplantı.' }, { status: 400 });
    }

    await connectToDatabase();
    const meeting = await Meeting.findById(id);
    if (!meeting) return NextResponse.json({ msg: 'Toplantı bulunamadı.' }, { status: 404 });

    if (meeting.organizer.toString() !== user.id) {
      return NextResponse.json({ msg: 'Bu toplantıya dosya ekleme yetkiniz yok.' }, { status: 403 });
    }

    if ((meeting.attachments?.length || 0) >= MEETING_FILE_MAX_COUNT) {
      return NextResponse.json({ msg: `Bir toplantıya en fazla ${MEETING_FILE_MAX_COUNT} dosya eklenebilir.` }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ msg: 'Dosya seçilmedi.' }, { status: 400 });
    }

    if (file.size > MEETING_FILE_MAX_SIZE) {
      return NextResponse.json({ msg: 'Dosya boyutu en fazla 25MB olabilir.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!MEETING_ALLOWED_EXT[ext]) {
      return NextResponse.json({ msg: 'Yalnızca Word (.doc, .docx), PDF ve ZIP/RAR dosyaları yüklenebilir.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(ext, buffer)) {
      return NextResponse.json({ msg: 'Dosya içeriği uzantısıyla uyuşmuyor veya bozuk.' }, { status: 400 });
    }

    // Tahmin edilemeyen ad: orijinal ad diske hiç yazılmaz
    const storedName = `${crypto.randomUUID()}${ext}`;
    await mkdir(MEETING_UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(MEETING_UPLOAD_DIR, storedName), buffer);

    meeting.attachments.push({
      originalName: path.basename(file.name).slice(0, 200),
      storedName,
      size: file.size,
      mimeType: MEETING_ALLOWED_EXT[ext],
      uploadedAt: new Date(),
    });
    await meeting.save();

    return NextResponse.json({ success: true, attachments: publicAttachments(meeting) }, { status: 201 });
  } catch (err) {
    console.error('Meeting attachment upload error:', err);
    return NextResponse.json({ msg: 'Dosya yüklenemedi.' }, { status: 500 });
  }
}

// Dosya sil: ?fileId=... (toplantıyı düzenleyen ya da admin)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  try {
    const { id } = await params;
    const fileId = new URL(request.url).searchParams.get('fileId');
    if (!mongoose.Types.ObjectId.isValid(id) || !fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
      return NextResponse.json({ msg: 'Geçersiz istek.' }, { status: 400 });
    }

    await connectToDatabase();
    const meeting = await Meeting.findById(id);
    if (!meeting) return NextResponse.json({ msg: 'Toplantı bulunamadı.' }, { status: 404 });

    if (meeting.organizer.toString() !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ msg: 'Bu dosyayı silme yetkiniz yok.' }, { status: 403 });
    }

    const att = meeting.attachments.find((a: { _id?: unknown }) => String(a._id) === fileId);
    if (!att) return NextResponse.json({ msg: 'Dosya bulunamadı.' }, { status: 404 });

    const storedName = path.basename(att.storedName);
    meeting.attachments = meeting.attachments.filter((a: { _id?: unknown }) => String(a._id) !== fileId);
    await meeting.save();

    try {
      await unlink(path.join(MEETING_UPLOAD_DIR, storedName));
    } catch {
      // dosya zaten yoksa kayıt silinmiş olması yeterli
    }

    return NextResponse.json({ success: true, attachments: publicAttachments(meeting) });
  } catch (err) {
    console.error('Meeting attachment delete error:', err);
    return NextResponse.json({ msg: 'Dosya silinemedi.' }, { status: 500 });
  }
}
