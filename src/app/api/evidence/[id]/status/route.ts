import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import Evidence from '@/src/lib/models/Evidence';
import EvidenceSession from '@/src/lib/models/EvidenceSession';
import User, { UserRole } from '@/src/lib/models/User';

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

    const session = await EvidenceSession.findById(evidence.sessionId);
    if (!session) {
      return NextResponse.json({ msg: 'İlgili oturum bulunamadı.' }, { status: 404 });
    }

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isCreator = session.createdBy.toString() === user.id;
    const isReporter = session.reporters.some((r: any) => r.toString() === user.id);
    const isSorumluRole = role === UserRole.KANIT_SORUMLU || role === UserRole.SUPERVISOR || role === UserRole.AMIR;

    if (!isAdmin && !isCreator && !isReporter && !isSorumluRole) {
      return NextResponse.json({ msg: 'Bu kanıtın durumunu güncelleme yetkiniz bulunmamaktadır.' }, { status: 403 });
    }

    const { status, reporterNote } = await req.json();

    if (!['pending', 'approved', 'rejected', 'revision_requested'].includes(status)) {
      return NextResponse.json({ msg: 'Geçersiz durum değeri.' }, { status: 400 });
    }

    evidence.status = status;
    if (reporterNote !== undefined) {
      evidence.reporterNote = reporterNote.trim();
    }
    evidence.reviewedBy = user.id as any;
    evidence.reviewedAt = new Date();

    await evidence.save();

    const updatedEvidence = await Evidence.findById(id)
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    return NextResponse.json(updatedEvidence);
  } catch (err: any) {
    console.error('Evidence Status PUT Error:', err);
    return NextResponse.json({ msg: 'Durum güncellenemedi', error: err.message }, { status: 500 });
  }
}
