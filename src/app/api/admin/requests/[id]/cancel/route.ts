import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import User, { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { sendPushToUser } from "@/src/lib/push";
import { sendMail } from "@/src/lib/mail";

const MIN_REASON = 3;
const MAX_REASON = 500;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Yönetici/genel sekreterlik talebi iptal eder (reddeder). Neden zorunludur ve talep sahibine iletilir.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;

  const { user, error } = getAuthenticatedUser(req);
  if (error) return error;

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
    return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (reason.length < MIN_REASON) {
      return NextResponse.json({ msg: 'Lütfen iptal/red nedenini yazın.' }, { status: 400 });
    }
    if (reason.length > MAX_REASON) {
      return NextResponse.json({ msg: `Neden en fazla ${MAX_REASON} karakter olabilir.` }, { status: 400 });
    }

    await connectToDatabase();

    // Atomik: yalnızca henüz tamamlanmamış / iptal edilmemiş talep iptal edilir
    const cancelled = await VehicleRequest.findOneAndUpdate(
      { _id: requestId, status: { $in: [RequestStatus.PENDING, RequestStatus.ASSIGNED] } },
      {
        status: RequestStatus.CANCELLED,
        cancelReason: reason,
        cancelledBy: user.id,
        cancelledAt: new Date()
      },
      { new: false } // önceki hâli döner: atanmış şoförü bilmek için
    ).populate('requestingUser', 'name email');

    if (!cancelled) {
      const exists = await VehicleRequest.exists({ _id: requestId });
      return NextResponse.json(
        { msg: exists ? 'Bu talep zaten tamamlanmış veya iptal edilmiş.' : 'Talep bulunamadı' },
        { status: exists ? 400 : 404 }
      );
    }

    // Atanmış şoför boşa çıktıysa müsait yap
    const driverId = cancelled.assignedDriver;
    if (driverId) {
      const remainingJobsCount = await VehicleRequest.countDocuments({
        assignedDriver: driverId,
        status: RequestStatus.ASSIGNED
      });
      if (remainingJobsCount === 0) {
        await User.findByIdAndUpdate(driverId, { driverStatus: 'available' });
      }
    }

    // Talep sahibine bildirim (hata işlemi bozmaz)
    const requester = cancelled.requestingUser as { _id: mongoose.Types.ObjectId; name?: string; email?: string } | null;
    if (requester?._id) {
      const route = `${cancelled.fromLocation} ➔ ${cancelled.toLocation}`;
      try {
        await sendPushToUser(String(requester._id), {
          title: 'Araç talebiniz iptal edildi',
          body: `${route}: ${reason}`.slice(0, 180),
          url: '/dashboard/taleplerim'
        });
      } catch (pushErr) {
        console.error('İptal bildirimi gönderilemedi:', pushErr);
      }

      if (requester.email) {
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #fca5a5; border-radius: 12px;">
            <h2 style="color: #dc2626; margin-top: 0;">Araç talebiniz iptal edildi</h2>
            <p>Merhaba ${escapeHtml(requester.name || '')},</p>
            <p><strong>Güzergah:</strong> ${escapeHtml(route)}<br/>
               <strong>Tarih / Saat:</strong> ${new Date(cancelled.startTime).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>
            <div style="background:#fef2f2; padding: 12px; border-radius: 8px;">
              <strong>İptal nedeni:</strong><br/>${escapeHtml(reason)}
            </div>
          </div>`;
        try {
          sendMail(requester.email, 'Araç Talebiniz İptal Edildi - YIU Portal', html);
        } catch (mailErr) {
          console.error('İptal e-postası gönderilemedi:', mailErr);
        }
      }
    }

    return NextResponse.json({ success: true, msg: 'Talep iptal edildi ve talep sahibine bildirildi.' }, { status: 200 });

  } catch (err) {
    console.error("Cancel Hatası:", err);
    return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });
  }
}
