import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:Request) {
    const {user, error} = getAuthenticatedUser(request as any);
    if(error) return error;

    try{
        await connectToDatabase();
        const myTasks = await VehicleRequest.find({
            assignedDriver : user.id,
            status : 'assigned'
        })
        .populate('requestingUser', 'name email')
        .sort({startTime : 1});

        return NextResponse.json(myTasks, {status : 200});
    }catch(error){
        console.error("My Tasks Error:", error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }   
}