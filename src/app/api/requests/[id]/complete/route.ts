import connectToDatabase from "@/src/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { UserRole } from "@/src/lib/models/User";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/src/lib/auth";


export async function PUT(
    request : NextRequest,
    {params} : {params : Promise<{id : string}>}
) {
    
    const {user, error} = getAuthenticatedUser(request);
              if(error) return error

    if(user.role !== UserRole.DRIVER)
    {
        return NextResponse.json({msg : 'Sadece şoförler iş tamamlayabilir.'}, {status :403});
    }
   try{
    const {id} = await params;
    const requestId = id

     if(!mongoose.Types.ObjectId.isValid(requestId))
        return NextResponse.json({msg : 'Geçersiz ID'}, {status : 400});

     await connectToDatabase();

     const requestDoc = await VehicleRequest.findById(requestId);
     if(!requestDoc)
        return NextResponse.json({ msg :'Talep bulunamadı.'}, {status : 404});

     if(requestDoc.assignedDriver?.toString() !== user.id)
        return NextResponse.json({msg : 'Size atanmamış bir işi tamamlayamazsınız.'}, {status : 403});

     requestDoc.status = RequestStatus.COMPLETED;
     await requestDoc.save();

     return NextResponse.json({msg : 'İş başarıyla tamamlandı', request:requestDoc}, {status : 200});
   }catch(error)
   {
    console.error(error);
    return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
   }
}

