import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import TechnicalRequest from '@/src/lib/models/TechnicalRequest';
import { getAuthenticatedUser } from '@/src/lib/auth';
import connectToDatabase from '@/src/lib/db';
import { UserRole } from '@/src/lib/models/User';
import { manageableCategories, type RequestCategory } from '@/src/lib/techAccess';


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR && user.role !== UserRole.ITADMIN) {
    return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    // supervisor yalnızca teknik servis, itadmin yalnızca bilgi işlem talebinin atamasını kaldırabilir
    const existing = await TechnicalRequest.findById(id).select('category');
    if (!existing) {
        return NextResponse.json({ msg: "Talep bulunamadı." }, { status: 404 });
    }
    const category: RequestCategory = existing.category === 'it' ? 'it' : 'technical';
    if (!manageableCategories(user.role).includes(category)) {
        return NextResponse.json({ msg: "Yasak: Bu talep için yetkiniz yok." }, { status: 403 });
    }

    const updated = await TechnicalRequest.findByIdAndUpdate(id, {
        status: 'pending',
        technicalStaff: [] 
    }, { new: true });

    if (!updated) {
        return NextResponse.json({ msg: "Talep bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true, msg: 'Personel ataması kaldırıldı.' });
  } catch (error) {
    console.error("Unassign error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}