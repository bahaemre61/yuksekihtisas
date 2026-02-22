import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { UserRole } from "@/src/lib/models/User";

export async function POST(request: Request) {
    try {
        const { user, error } = getAuthenticatedUser(request as any);
        if (error) return error;

        if (!['admin', 'amir', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ msg: 'Bu işlem için yetkiniz bulunmuyor.' }, { status: 403 });
        }

        const { requestIds, driverId } = await request.json();

        if (!requestIds || !Array.isArray(requestIds) || !driverId) {
            return NextResponse.json({ msg: 'Geçersiz veri: requestIds ve driverId gereklidir.' }, { status: 400 });
        }

        await connectToDatabase();

        const batchId = `TRIP-${Date.now()}`;

        const result = await VehicleRequest.updateMany(
            { 
                _id: { $in: requestIds },
                status: 'pending' 
            },
            { 
               assignedDriver: driverId,
                status: 'assigned',
                batchId: batchId
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