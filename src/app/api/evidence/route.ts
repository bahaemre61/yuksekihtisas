import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import Evidence from '@/src/lib/models/Evidence';
import EvidenceSession from '@/src/lib/models/EvidenceSession';
import User, { UserRole } from '@/src/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ msg: 'sessionId parametresi zorunludur.' }, { status: 400 });
    }

    await connectToDatabase();

    const session = await EvidenceSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ msg: 'Oturum bulunamadı.' }, { status: 404 });
    }

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isCreator = session.createdBy.toString() === user.id;
    const isReporter = session.reporters.some((r: any) => r.toString() === user.id);
    const isSorumluRole = role === UserRole.KANIT_SORUMLU || role === UserRole.SUPERVISOR || role === UserRole.AMIR || role === UserRole.RAPORTOR;

    const canSeeAll = isAdmin || isCreator || isReporter || isSorumluRole;

    const query: any = { sessionId };
    if (!canSeeAll) {
      // Normal kullanıcı sadece kendisinin yüklediği kanıtları görebilir
      query.uploadedBy = user.id;
    }

    const evidences = await Evidence.find(query)
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json(evidences);
  } catch (err: any) {
    console.error('Evidence GET Error:', err);
    return NextResponse.json({ msg: 'Kanıtlar getirilemedi', error: err.message }, { status: 500 });
  }
}
