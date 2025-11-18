import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { UserRole } from "@/src/lib/models/User";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
          if(error) return error

          if(user.role != UserRole.DRIVER && user.role != UserRole.ADMIN)
        {
            return NextResponse.json({msg : "Yasak : Bu işlem için yetkiniz yok. "}, {status : 403});
        }
    try{
        await connectToDatabase();

        const pendingRequest = await VehicleRequest.find({
            status  : RequestStatus.PENDING
        })
        .populate('requestingUser', 'name email')
        .sort({ startTime: 1});

        return NextResponse.json(pendingRequest, {status : 200});
    }catch(error)
    {
        console.error(error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
}