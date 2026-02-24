import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import User from "@/src/lib/models/User";
import { sendMail } from "@/src/lib/mail";

export async function POST(request: Request) {
    try {
        const { user: user, error } = getAuthenticatedUser(request as any);
        if (error) return error;

        const { requestIds, driverId } = await request.json();

        if (!requestIds || !driverId) {
            return NextResponse.json({ msg: 'Eksik bilgi: Talepler veya şoför seçilmedi.' }, { status: 400 });
        }

        await connectToDatabase();

        const driver = await User.findById(driverId);
        if (!driver) {
            return NextResponse.json({ msg: 'Şoför bulunamadı.' }, { status: 404 });
        }

        const result = await VehicleRequest.updateMany(
            { _id: { $in: requestIds }, status: RequestStatus.PENDING },
            { $set: { assignedDriver: driverId, status: RequestStatus.ASSIGNED } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ msg: 'Talepler güncellenemedi (Zaten atanmış olabilir).' }, { status: 400 });
        }

        // 4. PERSONELLERE MAİL GÖNDER (Talebi yapan herkesi bilgilendir)
        const assignedRequests = await VehicleRequest.find({ _id: { $in: requestIds } })
            .populate('requestingUser', 'email name');

        for (const req of assignedRequests) {
            if (req.requestingUser?.email) {
                const passengerSubject = "🚗 Araç Talebiniz Onaylandı";
                const passengerHtml = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">Merhaba ${req.requestingUser.name},</h2>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Şoför:</strong> ${driver.name}</p>
                            <p><strong>Güzergah:</strong> ${req.fromLocation} ➔ ${req.toLocation}</p>
                            <p><strong>Durum:</strong> Şoför Atandı / Hazırlanıyor 🟢</p>
                        </div>
                        <p>Lütfen belirtilen saatte hazır bulununuz.</p>
                    </div>
                `;
                sendMail(req.requestingUser.email, passengerSubject, passengerHtml);
            }
        }

        if (driver.email) {
            const driverSubject = "🆕 Yeni Görev Atandı - YIU Portal";
            const driverHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Merhaba ${driver.name},</h2>
                    <p>Sisteme size ait yeni bir sürüş görevi tanımlandı.</p>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Grup Sayısı:</strong> ${requestIds.length} Personel</p>
                        <p><strong>İşlem Yapan:</strong> ${user.name}</p>
                    </div>
                    <p>Görev detaylarını görmek ve sürüşü başlatmak için panelinize giriş yapınız.</p>
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/gorevlerim" 
                       style="display: inline-block; background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">
                       GÖREVLERİME GİT
                    </a>
                </div>
            `;
            sendMail(driver.email, driverSubject, driverHtml);
        }

        return NextResponse.json({ 
            msg: `${result.modifiedCount} adet talep ${driver.name} üzerine atandı ve bildirimler gönderildi.`, 
            success: true 
        }, { status: 200 });

    } catch (error) {
        console.error("Atama hatası: ", error);
        return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });
    }
}