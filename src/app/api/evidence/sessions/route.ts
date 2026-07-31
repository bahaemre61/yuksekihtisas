import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import EvidenceSession from '@/src/lib/models/EvidenceSession';
import User, { UserRole } from '@/src/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    await connectToDatabase();

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    let query: any = {};

    if (role === UserRole.ADMIN) {
      // Admin tüm oturumları görür
      query = {};
    } else if (role === UserRole.KANIT_SORUMLU || role === UserRole.SUPERVISOR || role === UserRole.AMIR) {
      // Sorumlu kendi oluşturduğu veya dahil olduğu oturumları görür
      query = {
        $or: [
          { createdBy: user.id },
          { reporters: user.id },
          { dataEntryUsers: user.id }
        ]
      };
    } else {
      // Raportör veya Kullanıcı dahil olduğu oturumları görür
      query = {
        $or: [
          { reporters: user.id },
          { dataEntryUsers: user.id },
          { createdBy: user.id }
        ]
      };
    }

    const sessions = await EvidenceSession.find(query)
      .populate('createdBy', 'name email role')
      .populate('reporters', 'name email role')
      .populate('dataEntryUsers', 'name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json(sessions);
  } catch (err: any) {
    console.error('Session GET Error:', err);
    return NextResponse.json({ msg: 'Sunucu hatası', error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    await connectToDatabase();

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const allowedRoles: string[] = [UserRole.ADMIN, UserRole.KANIT_SORUMLU, UserRole.SUPERVISOR, UserRole.AMIR];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ msg: 'Oturum oluşturmak için Alan Sorumlusu veya Admin yetkisi gereklidir.' }, { status: 403 });
    }

    const { title, description, reporters, dataEntryUsers } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ msg: 'Oturum başlığı zorunludur.' }, { status: 400 });
    }

    const newSession = await EvidenceSession.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      createdBy: user.id,
      reporters: reporters || [],
      dataEntryUsers: dataEntryUsers || [],
      status: 'active'
    });

    const populatedSession = await EvidenceSession.findById(newSession._id)
      .populate('createdBy', 'name email role')
      .populate('reporters', 'name email role')
      .populate('dataEntryUsers', 'name email role');

    return NextResponse.json(populatedSession, { status: 201 });
  } catch (err: any) {
    console.error('Session POST Error:', err);
    return NextResponse.json({ msg: 'Oturum oluşturulamadı', error: err.message }, { status: 500 });
  }
}
