import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { assignableCategories, parseCategory, staffRoleFor } from '@/src/lib/techAccess';

// Atanabilecek personel listesi: teknik servis için 'tech', bilgi işlem için 'it' rolündekiler.
export async function GET(request: NextRequest) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  const allowed = assignableCategories(user.role);
  if (allowed.length === 0) {
    return NextResponse.json({ success: false, error: 'Yasak: Yetkisiz giriş.' }, { status: 403 });
  }

  const requested = parseCategory(new URL(request.url).searchParams.get('category'));
  const category = requested && allowed.includes(requested) ? requested : allowed[0];

  try {
    await connectToDatabase();

    const technicians = await User.find({
      role: staffRoleFor(category),
      isActive: { $ne: false }
    }).select('_id name email title');

    if (technicians.length === 0) {
        console.log(`⚠️ UYARI: Hiç '${staffRoleFor(category)}' rolünde kullanıcı bulunamadı.`);
    }

    return NextResponse.json({ success: true, data: technicians });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen sunucu hatası";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
