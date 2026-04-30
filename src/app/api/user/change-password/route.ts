import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // Auth kontrolü
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, msg: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, msg: 'Tüm alanları doldurun.' }, { status: 400 });
    }

    const dbUser = await User.findById(authUser.user?.id).select('+password');
    if (!dbUser) {
      return NextResponse.json({ success: false, msg: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, msg: 'Mevcut şifreniz yanlış.' }, { status: 400 });
    }

    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(newPassword, salt);



    dbUser.password = newPassword;
    await dbUser.save();

    return NextResponse.json({ success: true, msg: 'Şifreniz başarıyla değiştirildi.' });
  } catch (error: any) {
    console.error('Password change error:', error);
    return NextResponse.json({ success: false, msg: 'Sunucu hatası.' }, { status: 500 });
  }
}
