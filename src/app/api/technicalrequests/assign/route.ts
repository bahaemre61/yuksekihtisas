import { NextResponse, NextRequest } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import User from "@/src/lib/models/User"; // Kullanıcı modelini kontrol için
import connectToDatabase from "@/src/lib/db";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { sendMail } from "@/src/lib/mail";
import mongoose from "mongoose";
import { assignableCategories, staffRoleFor, type RequestCategory } from "@/src/lib/techAccess";
import webpush from 'web-push';

export async function PUT(request: NextRequest) {
    try {
        const { user: authUser, error } = getAuthenticatedUser(request);
        if (error) return error;

        await connectToDatabase();

        const body = await request.json();
        const { requestId, technicianIds } = body;

        if (!requestId || !Array.isArray(technicianIds) || technicianIds.length === 0) {
            return NextResponse.json({ success: false, message: 'Veri eksik.' }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(requestId) || !technicianIds.every((id: unknown) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))) {
            return NextResponse.json({ success: false, message: 'Geçersiz kimlik.' }, { status: 400 });
        }

        // Talebin kategorisine göre yetki kontrolü (techamir -> teknik, itadmin -> bilgi işlem, admin -> ikisi)
        const existing = await TechnicalRequest.findById(requestId).select('category status');
        if (!existing) return NextResponse.json({ success: false, message: 'Talep bulunamadı.' }, { status: 404 });

        const category: RequestCategory = existing.category === 'it' ? 'it' : 'technical';
        if (!assignableCategories(authUser.role).includes(category)) {
            return NextResponse.json({ success: false, message: 'Yasak: Bu talebe atama yetkiniz yok.' }, { status: 403 });
        }
        if (existing.status === 'completed' || existing.status === 'cancelled') {
            return NextResponse.json({ success: false, message: 'Tamamlanmış veya iptal edilmiş talebe atama yapılamaz.' }, { status: 400 });
        }

        // Yalnızca ilgili kategorinin personeli atanabilir (teknik: tech, bilgi işlem: it)
        const validStaff = await User.countDocuments({
            _id: { $in: technicianIds },
            role: staffRoleFor(category),
            isActive: { $ne: false },
        });
        if (validStaff !== new Set(technicianIds).size) {
            return NextResponse.json({ success: false, message: 'Seçilen personel bu talep türüne atanamaz.' }, { status: 400 });
        }

        const isIt = category === 'it';

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
                        title: isIt ? '💻 BİLGİ İŞLEM GÖREVİ ATANDI!' : '🛠️ TEKNİK GÖREV ATANDI!',
                        body: `${updatedRequest.title} konusu için görevlendirildiniz.`,
                        url: '/dashboard/teknikgorevlerim'
                    });

                    try {
                        const res = await webpush.sendNotification(staff.pushSubscription, payload);
                        console.log(`🚀 ${staff.name} bildirim sonucu:`, res.statusCode);
                    } catch (err: any) {
                        console.error(`❌ ${staff.name} gönderim hatası:`, err.message);
                        if (err.statusCode === 403 || err.statusCode === 410 || err.statusCode === 404) {
                            console.log(`🧹 ${staff.name} kullanıcısının geçersiz push aboneliği temizleniyor...`);
                            await User.findByIdAndUpdate(staff._id, { $unset: { pushSubscription: "" } });
                        }
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
            const subject = isIt ? "💻 Bilgi İşlem Talebiniz Hakkında" : "🛠️ Teknik Destek Talebiniz Hakkında";
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #ea580c;">Merhaba ${updatedRequest.user.name},</h2>
                    <p>Oluşturduğunuz ${isIt ? 'bilgi işlem' : 'teknik destek'} talebi işleme alındı.</p>
                    <div style="background-color: #fff7ed; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ea580c;">
                        <p style="margin: 5px 0;"><strong>Konu:</strong> ${updatedRequest.title}</p>
                        <p style="margin: 5px 0;"><strong>${isIt ? 'Bilgi İşlem Personeli' : 'Teknik Personeller'}:</strong> ${staffNames}</p>
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


