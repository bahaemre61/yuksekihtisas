import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import User, { UserRole } from "@/src/lib/models/User";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/src/lib/auth";



export async function PUT(request:NextRequest, { params }: { params: Promise<{ id: string }> }) {

    const {user, error} = getAuthenticatedUser(request);
    if(error) return error

    if(user.role !== UserRole.DRIVER)
        {
            return NextResponse.json({msg : 'Yasak: Bu işlem için yetkiniz yok'}, {status : 403});
        }
 
    try{
        const {id} = await params;
        const requestId = id;
        if(!mongoose.Types.ObjectId.isValid(requestId)){
            return NextResponse.json({msg : 'Geçersiz Talep ID'},{status : 400});
        }
        await connectToDatabase();
        const updatedRequest = await VehicleRequest.findOneAndUpdate({
            _id: requestId,
            status : RequestStatus.PENDING
        },
        {
            status: RequestStatus.ASSIGNED,
            assignedDriver: user.id
        },
        {new : true}
    );
    if (!updatedRequest) {
      return NextResponse.json({ msg: 'Bu talep artık mevcut değil (başka bir şoför tarafından alınmış olabilir).' }, { status: 400 });
    }

    await User.findByIdAndUpdate(user.id, { driverStatus: 'busy' });

    return NextResponse.json({msg : 'İş başaryıla kabul edildi', request: updatedRequest}, {status : 200});

    }catch(error){        
        console.error("Giriş hatası : ",error);
        return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });    
    }
}