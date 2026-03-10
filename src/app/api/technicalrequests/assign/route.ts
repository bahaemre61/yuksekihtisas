import { NextResponse, NextRequest } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import User from "@/src/lib/models/User"; // Kullanıcı modelini kontrol için
import connectToDatabase from "@/src/lib/db";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { sendMail } from "@/src/lib/mail";
import webpush from 'web-push';

export async function PUT(request: NextRequest) {
    try {
        const { user: authUser, error } = getAuthenticatedUser(request);
        if (error) return error;

        await connectToDatabase();

        const body = await request.json();
        const { requestId, technicianIds } = body;

        if (!requestId || !technicianIds) {
            return NextResponse.json({ success: false, message: 'Veri eksik.' }, { status: 400 });
        }

        // 1. GÜNCELLEME VE POPULATE (pushSubscription'ı özellikle çekiyoruz)
        const updatedRequest = await TechnicalRequest.findByIdAndUpdate(
            requestId,
            { technicalStaff: technicianIds, status: 'assigned' },
            { new: true }
        )
        .populate('user', 'name email')
        .populate('technicalStaff', 'name pushSubscription'); // 🚨 BURASI KRİTİK

        if (!updatedRequest) return NextResponse.json({ success: false, message: 'Talep bulunamadı.' });

        // --- 🕵️‍♂️ DEBUG LOGLARI (Terminalden kontrol et Baha!) ---
        console.log("--- BİLDİRİM SÜRECİ BAŞLADI ---");
        console.log("Atanan Personel Sayısı:", updatedRequest.technicalStaff.length);

        // --- 🚨 WEB PUSH YAPILANDIRMASI (Fonksiyon içinde olmalı) ---
        const pubKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        const privKey = process.env.VAPID_PRIVATE_KEY;

        if (!pubKey || !privKey) {
            console.error("❌ HATA: VAPID Keyleri .env dosyasında bulunamadı!");
        } else {
            webpush.setVapidDetails('mailto:admin@universite.edu.tr', pubKey, privKey);

            // Her teknik personel için bildirim gönderimi
            const pushPromises = updatedRequest.technicalStaff.map(async (staff: any) => {
                if (staff.pushSubscription && staff.pushSubscription.endpoint) {
                    console.log(`✅ ${staff.name} için bildirim gönderiliyor...`);
                    
                    const payload = JSON.stringify({
                        title: '🛠️ TEKNİK GÖREV ATANDI!',
                        body: `${updatedRequest.title} konusu için görevlendirildiniz.`,
                        url: '/dashboard/teknikgorevlerim'
                    });

                    try {
                        const res = await webpush.sendNotification(staff.pushSubscription, payload);
                        console.log(`🚀 ${staff.name} bildirim sonucu:`, res.statusCode);
                    } catch (err: any) {
                        console.error(`❌ ${staff.name} gönderim hatası:`, err.message);
                    }
                } else {
                    console.log(`⚠️ ${staff.name} için abonelik verisi (pushSubscription) BULUNAMADI!`);
                }
            });

            await Promise.all(pushPromises);
        }
        console.log("--- BİLDİRİM SÜRECİ BİTTİ ---");

        // Mail gönderim kısmı (Aynen devam...)
        if (updatedRequest.user?.email) {
            const staffNames = updatedRequest.technicalStaff.map((staff: any) => staff.name).join(', ');
            const subject = "🛠️ Teknik Destek Talebiniz Hakkında";
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #ea580c;">Merhaba ${updatedRequest.user.name},</h2>
                    <p>Oluşturduğunuz teknik destek talebi işleme alındı.</p>
                    <div style="background-color: #fff7ed; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ea580c;">
                        <p style="margin: 5px 0;"><strong>Konu:</strong> ${updatedRequest.title}</p>
                        <p style="margin: 5px 0;"><strong>Teknik Personeller:</strong> ${staffNames}</p>
                        <p style="margin: 5px 0;"><strong>Durum:</strong> Atandı</p>
                    </div>
                </div>
            `;
            sendMail(updatedRequest.user.email, subject, htmlContent);
        }

        return NextResponse.json({ success: true, data: updatedRequest });

    } catch (error: any) {
        console.error("CRITICAL API ERROR:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}


