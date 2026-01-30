import { NextResponse } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import connectToDatabase from "@/src/lib/db";

//import User from '@/src/lib/models/User'; 

export async function GET() {
  try {
        await connectToDatabase();

    const requests = await TechnicalRequest.find({ status: 'pending' })
      .populate('user', 'name email') // User tablosundan isim ve emaili getir
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: requests });

  } catch (error: any) {
    console.error("❌ API İÇİNDE HATA:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Bilinmeyen sunucu hatası' 
    }, { status: 500 });
  }
}