import { NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie'; // Cookie oluşturmak için

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ msg: 'Geçersiz kimlik bilgileri.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ msg: 'Geçersiz kimlik bilgileri.' }, { status: 400 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ msg: 'Hesabınız deaktiftir. Lütfen yöneticinizle iletişime geçin.' }, { status: 400 });
    }

    const payload = {
      id: user.id,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '6h' } 
    );

    
    const serializedCookie = serialize('token', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 60 * 60, 
      path: '/', 
    });

    // Mobil istemci (X-Client-Type: mobile) cookie yerine token'ı yanıt gövdesinde alır ve
    // sonraki isteklerde "Authorization: Bearer <token>" gönderir. Web tarafı değişmez:
    // token yalnızca httpOnly cookie'de kalır, JS'e hiç görünmez.
    if (request.headers.get('x-client-type') === 'mobile') {
      return NextResponse.json({
        success: true,
        msg: 'Giriş başarılı',
        token,
        expiresIn: 6 * 60 * 60,
        user: { _id: user.id, name: user.name, role: user.role },
      });
    }

    return NextResponse.json(
      { success: true, msg: 'Giriş başarılı' },
      {
        status: 200,
        headers: {
          'Set-Cookie': serializedCookie
        }
      }
    );

  } catch (error) {
    console.error(error);
    return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });
  }
}