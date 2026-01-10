import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, {RequestStatus} from "@/src/lib/models/VehicleRequest";


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
        return NextResponse.json({msg: `${result.modifiedCount} adet talep zimmetinize atandı.`, success : true},{status : 200});
    }catch(error)
    {
        console.error("Gruplandırılmış istekleri alırken hata : ", error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
}