import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';


export async function GET(request: NextRequest) { 

  const {user, error} = getAuthenticatedUser(request);

  if(error) return error;
  try {

    await connectToDatabase();

    const dbUser = await User.findById(user.id).select('name role driverStatus');

    if(!user){
      return NextResponse.json({msg : 'Yetkisiz : Kullanıcı bulunamadı'}, {status : 401});
    }


    return NextResponse.json({
      name: dbUser.name,
      role: dbUser.role,
      driverStatus : dbUser.driverStatus
    });
    
  } catch (error) {
    return NextResponse.json({ msg: 'Yetkisiz: Geçersiz token' }, { status: 401 });
  }
}