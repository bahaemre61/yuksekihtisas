import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import connectToDatabase from "@/src/lib/db";
import '@/src/lib/models/User';
import { getAuthenticatedUser } from "@/src/lib/auth";
import { assignableCategories, categoryFilter, parseCategory } from "@/src/lib/techAccess";

// Atama bekleyen talepler. Kategori rolden belirlenir:
//  techamir -> teknik servis, itadmin -> bilgi işlem, admin -> ?category= ile seçer (varsayılan teknik servis)
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

    const requests = await TechnicalRequest.find({ status: 'pending', ...categoryFilter([category]) })
      .populate('user', 'name email') // User tablosundan isim ve emaili getir
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: requests });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen sunucu hatası";
    console.error("❌ API İÇİNDE HATA:", error);

    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}
