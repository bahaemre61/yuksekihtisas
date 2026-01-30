import { NextResponse } from 'next/server';
import  connectToDatabase  from '@/src/lib/db';
import User, {UserRole} from '@/src/lib/models/User';

export async function GET() {
  try {
    await connectToDatabase();

    const technicians = await User.find({ 
      role: UserRole.TECHNICAL 
    }).select('_id name email title'); 

    if (technicians.length === 0) {
        console.log("⚠️ UYARI: Hiç 'tech' rolünde kullanıcı bulunamadı.");
    }

    return NextResponse.json({ success: true, data: technicians });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}