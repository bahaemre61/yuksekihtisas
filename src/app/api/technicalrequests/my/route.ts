import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db'; // DB bağlantı dosyanız
import TechnicalRequest from '@/src/lib/models/TechnicalRequest'; // Model dosyanız
// User modelini de import edelim ki populate ederken "User şeması kayıtlı değil" hatası almayalım
import '@/src/lib/models/User'; 
import { getAuthenticatedUser } from '@/src/lib/auth'; // Auth helper'ınız

export async function GET(request: NextRequest) { 
  
  const { user, error } = getAuthenticatedUser(request);

  if (error) return error;

  try {
    await connectToDatabase();

    const myRequests = await TechnicalRequest.find({ user: user.id })
      .sort({ createdAt: -1 }) // En yeni talepler en üstte
      .populate('technicalStaff', 'name title'); // Atanan personelin adını ve ünvanını getir

    // 3. Veriyi Döndür
    return NextResponse.json({
      success: true,
      data: myRequests
    });
    
  } catch (error: any) {
    console.error("Taleplerim API Hatası:", error);
    return NextResponse.json({ msg: 'Sunucu hatası oluştu' }, { status: 500 });
  }
}