import connectToDatabase from "@/src/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import User,{ UserRole } from "@/src/lib/models/User";
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
    await connectToDatabase();


    const updatedRequest = await VehicleRequest.findByIdAndUpdate(
      id,
      {status : RequestStatus.COMPLETED},
      {new : true}
    );

    if(!updatedRequest){
        return NextResponse.json({msg : 'Talep bulunamadı.'}, {status : 404});
    }

    const activeJobsCount = await VehicleRequest.countDocuments({
      assignedDriver : user.id,
      status : RequestStatus.ASSIGNED
    });

    if(activeJobsCount === 0){
      await User.findByIdAndUpdate(user.id, {driverStatus : 'available'});
   }else
   {
      await User.findByIdAndUpdate(user.id, {driverStatus : 'busy'});
   }
   return NextResponse.json({msg : 'İşle başarıyla alındı.',updatedRequest} ,{status : 200});
}catch (error)
{
   console.error("İş tamamlama hatası : ", error);
   return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
}
}
