import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, {RequestStatus} from "@/src/lib/models/VehicleRequest";
import { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";


export async function PUT(requests:NextRequest,{params}: {params: Promise<{id:string}>}){
    const {user,error}= getAuthenticatedUser(requests);
    if(error) return error;

    if(user.role !== UserRole.ADMIN)
    {
        return NextResponse.json({msg : "Yasak: Yetkisiz giriş."}, {status : 403});
    }

    try{
        const {id} = await params;
        await connectToDatabase();

        const updatedRequest = await VehicleRequest.findByIdAndUpdate(
            id,
            {
                status : RequestStatus.PENDING,
                assignedDriver: null
            },
            {new : true}
        );

        if(!updatedRequest)
        {
            return NextResponse.json({msg :'Talep bulunamadı'}, {status : 404});
        }

        return NextResponse.json({msg : 'Talep boşa çıkarıldı.', requests : updatedRequest}, {status : 200});
    }catch(error){
        console.error(error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
}
