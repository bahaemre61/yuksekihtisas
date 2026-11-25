import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import path from 'path';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import connectToDatabase from '@/src/lib/db';
import Meeting from '@/src/lib/models/MeetingSchema';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { UserRole } from '@/src/lib/models/User';
import { MEETING_UPLOAD_DIR } from '@/src/lib/meetingFiles';

// Dosya indir: toplantıyı düzenleyen, toplantıya katılan kayıtlı kullanıcılar ve admin
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  try {
    const { id, fileId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return NextResponse.json({ msg: 'Geçersiz istek.' }, { status: 400 });
    }

    await connectToDatabase();
    const meeting = await Meeting.findById(id);
    if (!meeting) return NextResponse.json({ msg: 'Toplantı bulunamadı.' }, { status: 404 });

    const isOrganizer = meeting.organizer.toString() === user.id;
    const isAttendee = meeting.attendees.some((a: { user?: { toString(): string } }) => a.user && a.user.toString() === user.id);
    if (!isOrganizer && !isAttendee && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ msg: 'Bu dosyaya erişim yetkiniz yok.' }, { status: 403 });
    }

    const att = meeting.attachments.find((a: { _id?: unknown }) => String(a._id) === fileId);
    if (!att) return NextResponse.json({ msg: 'Dosya bulunamadı.' }, { status: 404 });

    let data: Buffer;
    try {
      data = await readFile(path.join(MEETING_UPLOAD_DIR, path.basename(att.storedName)));
    } catch {
      return NextResponse.json({ msg: 'Dosya sunucuda bulunamadı.' }, { status: 404 });
    }

    const asciiName = att.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': att.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(att.originalName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Meeting attachment download error:', err);
    return NextResponse.json({ msg: 'Dosya indirilemedi.' }, { status: 500 });
  }
}
