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

    const payload = {
      id: user.id,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1h' } // 1 saat
    );

    
    const serializedCookie = serialize('token', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 60 * 60, 
      path: '/', 
    });

    // JSON cevabını oluştur ve 'Set-Cookie' başlığını ekle
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