import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function PUT(
    request: NextRequest,
    {params} : {params : Promise <{id : string}>}
    )
    {
        const {user , error} = getAuthenticatedUser(request);
        if(error) return error;

        try{
            const {id} = await params;
            const requestId = id;

            if(!mongoose.Types.ObjectId.isValid(requestId))
            {
                return NextResponse.json({msg : 'Geçersiz ID'}, {status : 400});
            }

            await connectToDatabase();

            const requestDoc = await VehicleRequest.findById(requestId);

            if(!requestDoc){
                console.log("❌ Talep veritabanında bulunamadı.");
                return NextResponse.json({msg : 'Talep bulunamadı.'}, {status : 404});
            }
            console.log("3. Talep Bulundu. Mevcut Durumu:", requestDoc.status);
             console.log("   Talep Sahibi ID:", requestDoc.requestingUser.toString());

            if(requestDoc.requestingUser.toString() !== user.id && user.role !== 'admin'){
                console.log("❌ Yetki Hatası: Kullanıcı bu talebin sahibi değil.");
                return NextResponse.json({msg : 'Bu talebi iptal etme yetkiniz yok.'}, {status : 403});
            }

            if(requestDoc.status !== RequestStatus.PENDING) {
                console.log("❌ Durum Hatası: Talep 'pending' değil.");
                return NextResponse.json({ msg : 'Sadece beklemedeki talepler iptal edilebilir.'}, {status : 400});
            }

            requestDoc.status = "cancelled";
            await requestDoc.save();
            
            return NextResponse.json({msg : 'Talep başarıyla iptal edildi.', request : requestDoc}, {status : 200});

        }catch(err){
            console.error(err);
            return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
        }
}
