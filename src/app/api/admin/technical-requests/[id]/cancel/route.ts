import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import TechnicalRequest from '@/src/lib/models/TechnicalRequest';
import { getAuthenticatedUser } from '@/src/lib/auth';
import connectToDatabase from '@/src/lib/db';
import { UserRole } from '@/src/lib/models/User';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
  }

  try {
    const { id } = await params; 
    await connectToDatabase();

    const requestDoc = await TechnicalRequest.findById(id);

    if (!requestDoc) {
        return NextResponse.json({ msg: "Talep bulunamadı." }, { status: 404 });
    }

    if (requestDoc.status === 'completed' || requestDoc.status === 'cancelled') {
        return NextResponse.json({ msg: "Bu talep zaten tamamlanmış veya iptal edilmiş." }, { status: 400 });
    }

    const updated = await TechnicalRequest.findByIdAndUpdate(id, {
        status: 'cancelled',
    }, { new: true });

    return NextResponse.json({ success: true, msg: 'Talep başarıyla iptal edildi.' });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json({ success: false, msg: 'Sunucu hatası' }, { status: 500 });
  }
}
