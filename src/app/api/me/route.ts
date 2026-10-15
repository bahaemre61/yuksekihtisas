import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { isMaterialRequestAllowed } from '@/src/lib/materialAccess';


export async function GET(request: NextRequest) { 

  const {user, error} = getAuthenticatedUser(request);

  if(error) return error;
  try {

    await connectToDatabase();

    const dbUser = await User.findById(user.id).select('name role driverStatus isActive canCreateMaterialRequest');

    if(!dbUser || dbUser.isActive === false){
      return NextResponse.json({msg : 'Yetkisiz : Kullanıcı bulunamadı veya deaktif'}, {status : 401});
    }


    return NextResponse.json({
      _id: dbUser._id,
      name: dbUser.name,
      role: dbUser.role,
      driverStatus : dbUser.driverStatus,
      canCreateMaterialRequest: isMaterialRequestAllowed(dbUser)
    });
    
  } catch (error) {
    return NextResponse.json({ msg: 'Yetkisiz: Geçersiz token' }, { status: 401 });
  }
}