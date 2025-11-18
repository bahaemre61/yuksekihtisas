import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
      if(error) return error

    try{   
        await connectToDatabase();

        const myRequests = await VehicleRequest.find({
            requestingUser : user.id
        })
        .populate('assignedDriver', 'name')
        .sort({createdAt: -1});

        return NextResponse.json(myRequests, {status:200})
    }catch (error){
        console.error(error);
        return NextResponse.json({msg : "Sunucu Hatası"}, {status : 500});
    }
    
}