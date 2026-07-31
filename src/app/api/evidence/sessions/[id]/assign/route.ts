import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
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

    const session = await EvidenceSession.findById(id);
    if (!session) {
      return NextResponse.json({ msg: 'Oturum bulunamadı.' }, { status: 404 });
    }

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isCreator = session.createdBy.toString() === user.id;
    const isReporter = session.reporters.some((r: any) => r.toString() === user.id);

    if (!isAdmin && !isCreator && !isReporter) {
      return NextResponse.json({ msg: 'Bu oturumu güncelleme yetkiniz yok.' }, { status: 403 });
    }

    const body = await req.json();
    const { reporters, dataEntryUsers } = body;

    // Admin veya Oturum Oluşturan Sorumlu Raportör atayabilir
    if (isAdmin || isCreator) {
      if (reporters !== undefined) {
        session.reporters = reporters;
      }
    }

    // Raportör, Sorumlu ve Admin Veri Giriş Kullanıcıları atayabilir
    if (dataEntryUsers !== undefined) {
      session.dataEntryUsers = dataEntryUsers;
    }

    await session.save();

    const updatedSession = await EvidenceSession.findById(id)
      .populate('createdBy', 'name email role')
      .populate('reporters', 'name email role')
      .populate('dataEntryUsers', 'name email role');

    return NextResponse.json(updatedSession);
  } catch (err: any) {
    console.error('Session Assign PUT Error:', err);
    return NextResponse.json({ msg: 'Atama işlemi başarısız', error: err.message }, { status: 500 });
  }
}
