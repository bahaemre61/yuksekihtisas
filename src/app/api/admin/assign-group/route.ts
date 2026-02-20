import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { UserRole } from "@/src/lib/models/User";

export async function POST(request: Request) {
    try {
        // 1. Yetki Kontrolü
        const { user, error } = getAuthenticatedUser(request as any);
        if (error) return error;

        // Sadece Admin veya Amir atama yapabilir
        if (!['admin', 'amir', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ msg: 'Bu işlem için yetkiniz bulunmuyor.' }, { status: 403 });
        }

        // 2. Veri Kontrolü
        const { requestIds, driverId } = await request.json();

        if (!requestIds || !Array.isArray(requestIds) || !driverId) {
            return NextResponse.json({ msg: 'Geçersiz veri: requestIds ve driverId gereklidir.' }, { status: 400 });
        }

        await connectToDatabase();

        // 3. Talepleri Şoföre Atama
        // Durumu 'assigned' yapıyoruz ve atanan şoförün ID'sini kaydediyoruz
        const result = await VehicleRequest.updateMany(
            { 
                _id: { $in: requestIds },
                status: 'pending' // Sadece bekleyen talepler atanabilir
            },
            { 
                $set: { 
                    assignedDriver: driverId, 
                    status: 'assigned' 
                } 
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ 
                msg: 'Atanacak uygun talep bulunamadı (zaten atanmış veya iptal edilmiş olabilir).' 
            }, { status: 400 });
        }
        return NextResponse.json({ 
            success: true, 
            msg: `${result.modifiedCount} adet talep başarıyla şoföre atandı.`,
            modifiedCount: result.modifiedCount
        }, { status: 200 });

    } catch (error) {
        console.error("Atama Hatası:", error);
        return NextResponse.json({ msg: 'Sunucu hatası oluştu.' }, { status: 500 });
    }
}