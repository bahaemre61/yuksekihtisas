import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, {RequestStatus} from "@/src/lib/models/VehicleRequest";
import User from "@/src/lib/models/User";
import {sendMail} from "@/src/lib/mail";


export async function POST(request: Request){
    try{
        const {user, error} = getAuthenticatedUser(request as any);
        if(error) return error;

        const {requestIds} = await request.json();

        if(!requestIds || !Array.isArray(requestIds) || requestIds.length === 0){
            return NextResponse.json({msg : 'Geçersiz istek kimlikleri.'}, {status : 400});
        }
        await connectToDatabase();

        const result = await VehicleRequest.updateMany(
            {
                _id : {$in : requestIds},
                status : RequestStatus.PENDING
            },
            {
                $set : {
                    assignedDriver : user.id,
                    status : RequestStatus.ASSIGNED
                }
            }
        );

        if(result.modifiedCount === 0){
            return NextResponse.json({msg : 'Bu talepler zaten alınmış veya bulunamadı.'}, {status : 400});
        }
        await User.findByIdAndUpdate(user.id, {
        driverStatus: 'busy'
    });

    const assignedRequests = await VehicleRequest.find({_id : {$in : requestIds}})
    .populate('requestingUser', 'email name');

    for(const req of assignedRequests){
        if(req.requestingUser?.email){
            const subject = "🚗 Araç Talebiniz Hakkında";
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #2563eb;">Merhaba ${req.requestingUser.name},</h2>
                    <p>Araç talebiniz onaylandı ve şoförünüz atandı.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Şoför:</strong> ${user.name}</p>
                        <p style="margin: 5px 0;"><strong>Güzergah:</strong> ${req.fromLocation} ➔ ${req.toLocation}</p>
                        <p style="margin: 5px 0;"><strong>Durum:</strong> Yola Çıkıldı 🟢</p>
                    </div>

                    <p>Lütfen belirtilen konumda hazır bulununuz.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888;">Bu mesaj otomatik olarak gönderilmiştir.</p>
                </div>
            `;
            sendMail(req.requestingUser.email, subject, htmlContent);
        }
    }
        return NextResponse.json({msg: `${result.modifiedCount} adet talep zimmetinize atandı.`, success : true},{status : 200});
    }catch(error)
    {
        console.error("Gruplandırılmış istekleri alırken hata : ", error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
}