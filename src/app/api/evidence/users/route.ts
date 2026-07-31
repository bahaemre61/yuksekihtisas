import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import User, { UserRole } from '@/src/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    await connectToDatabase();

    const users = await User.find({ isActive: { $ne: false } })
      .select('name email role')
      .sort({ name: 1 });

    return NextResponse.json(users);
  } catch (err: any) {
    console.error('Evidence Users GET Error:', err);
    return NextResponse.json({ msg: 'Kullanıcılar getirilemedi', error: err.message }, { status: 500 });
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

    if (role !== UserRole.ADMIN && role !== UserRole.KANIT_SORUMLU && role !== UserRole.SUPERVISOR) {
      return NextResponse.json({ msg: 'Rol atama yetkiniz bulunmamaktadır.' }, { status: 403 });
    }

    const { targetUserId, newRole } = await req.json();

    if (!targetUserId || !newRole) {
      return NextResponse.json({ msg: 'Hedef kullanıcı ve yeni rol zorunludur.' }, { status: 400 });
    }

    if (!Object.values(UserRole).includes(newRole)) {
      return NextResponse.json({ msg: 'Geçersiz rol.' }, { status: 400 });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ msg: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    targetUser.role = newRole;
    await targetUser.save();

    return NextResponse.json({
      msg: 'Kullanıcı rolü başarıyla güncellendi.',
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (err: any) {
    console.error('Evidence Users POST Error:', err);
    return NextResponse.json({ msg: 'Rol atanamadı', error: err.message }, { status: 500 });
  }
}
