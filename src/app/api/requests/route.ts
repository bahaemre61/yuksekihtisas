import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function POST(request: NextRequest) {

  const {user, error} = getAuthenticatedUser(request);
      if(error) return error

  try {
        const{
            willCarryItems,
            fromLocation,
            toLocation,
            purpose,
            startTime,
            endTime,
            priority
        }= await request.json();

        if(!fromLocation || !toLocation || !purpose || willCarryItems === undefined || !startTime || !endTime){
            return NextResponse.json({msg : 'Lütfen tüm zorunlu alanları doldurun.'},{status : 400});
        }
        if (new Date(endTime) <= new Date(startTime)){
            return NextResponse.json({msg: 'Dönüş saati, gidiş saatinden sonra olmalıdır.'}, {status : 400});
        }

        await connectToDatabase();

        const newRequest = new VehicleRequest({
        requestingUser: user.id,
        willCarryItems,
        fromLocation,
        toLocation,
        purpose,
        startTime,
        endTime,
        priority: priority || 'normal',
        status: RequestStatus.PENDING
    });
    const savedRequest = await newRequest.save();
    
    return NextResponse.json(savedRequest, {status : 201});
    }catch(error)
    {    
        console.error(error)
        return NextResponse.json({msg : 'Sunucu Hatası'},{status : 500});
    }
}