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