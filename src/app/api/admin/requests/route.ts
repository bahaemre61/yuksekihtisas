import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { UserRole } from "@/src/lib/models/User";
import User from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {
    
    const{user, error} = getAuthenticatedUser(request);
    if(error) return error;


    if(user.role !== UserRole.ADMIN && user.role !== UserRole.AMIR)
    {
        return NextResponse.json({msg : 'Yasak: Sadece adminler ve amirler erişebilir'}, {status : 403});
    }

    try{
        await connectToDatabase();

        const allRequests = await VehicleRequest.find({})
        .populate('requestingUser', 'name email')
        .populate('assignedDriver', 'name email')
        .sort({ createdAt: -1});

        return NextResponse.json(allRequests, {status : 200});
    }catch(error){
        console.error("Admin Requests Error:", error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
    
}