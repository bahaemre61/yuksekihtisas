import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { sendPushToUser } from "@/src/lib/push";
import { categoryFilter, workerCategories } from "@/src/lib/techAccess";

// Görevli kendi kategorisindeki işleri görür: tech -> teknik servis, it -> bilgi işlem, admin -> hepsi
export async function GET(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
      if(error) return error

    const categories = workerCategories(user.role);
    if(categories.length === 0)
        return NextResponse.json({msg: 'Yasak: Yetkisiz giriş.'}, {status : 403});

  await connectToDatabase();

  const tasks = await TechnicalRequest.find({
    technicalStaff: user.id,
    status: 'assigned',
    ...categoryFilter(categories)
  }).populate('user', 'name location');

  return NextResponse.json({ success: true, data: tasks });
}

// Görevli işi tamamlar: durum + tamamlanma zamanı yazılır, talep sahibine anlık bildirim gider.
export async function PUT(request: NextRequest) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  const categories = workerCategories(user.role);
  if (categories.length === 0) {
    return NextResponse.json({ success: false, msg: 'Yasak: Yetkisiz giriş.' }, { status: 403 });
  }

  try {
    const { requestId } = await request.json();
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json({ success: false, msg: 'Geçersiz talep.' }, { status: 400 });
    }

    await connectToDatabase();

    // Görevli sadece kendisine atanmış, tamamlanmamış talebi kapatabilir (admin hepsini)
    const filter: Record<string, unknown> = {
      _id: requestId,
      status: { $in: ['assigned', 'in_progress'] },
      ...categoryFilter(categories),
    };
    if (user.role !== 'admin') filter.technicalStaff = user.id;

    const completed = await TechnicalRequest.findOneAndUpdate(
      filter,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );

    if (!completed) {
      return NextResponse.json({ success: false, msg: 'Talep bulunamadı, size atanmamış veya zaten tamamlanmış.' }, { status: 404 });
    }

    // Talep sahibine anlık bildirim (abone değilse sessizce atlanır; bildirim hatası işlemi bozmaz)
    try {
      await sendPushToUser(String(completed.user), {
        title: completed.category === 'it' ? 'Bilgi işlem talebiniz tamamlandı' : 'Teknik talebiniz tamamlandı',
        body: `"${completed.title}" talebiniz tamamlandı. Lütfen hizmeti değerlendirin.`,
        url: '/dashboard/tekniktaleplerim'
      });
    } catch (pushErr) {
      console.error('Tamamlanma bildirimi gönderilemedi:', pushErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('İş tamamlama hatası:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
