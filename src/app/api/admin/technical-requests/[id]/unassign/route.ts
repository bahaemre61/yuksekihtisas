import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import TechnicalRequest from '@/src/lib/models/TechnicalRequest';
import { getAuthenticatedUser } from '@/src/lib/auth';
import connectToDatabase from '@/src/lib/db';
import { UserRole } from '@/src/lib/models/User';


export async function PUT(request: NextRequest) {
   const {user,error}= getAuthenticatedUser(request);
      if(error) return error;
  
      if(user.role !== UserRole.ADMIN)
      {
          return NextResponse.json({msg : "Yasak: Yetkisiz giriş."}, {status : 403});
      }

  try {
    const { requestId } = await request.json();
    await connectToDatabase();

    await TechnicalRequest.findByIdAndUpdate(requestId, {
        status: 'pending',
        technicalStaff: [] 
    });

    return NextResponse.json({ success: true, msg: 'Personel ataması kaldırıldı.' });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}