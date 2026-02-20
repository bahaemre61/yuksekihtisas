import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import User from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function POST(request:Request) {
    try{
        const {user, error} = getAuthenticatedUser(request as any);
        if(error) return error;

        await connectToDatabase();

        const result = await VehicleRequest.updateMany(
            {
                assignedDriver : user.id,
                status : 'assigned'
            },
            {
                $set : { status : 'completed' }
            }
        );
        await User.findByIdAndUpdate(user.id, { driverStatus : 'available' });

        return NextResponse.json({msg : 'Görev başarıyla tamamlandı', success : true, completedCount : result.modifiedCount}, {status : 200});
        }catch(error){
            console.error("Complete Task Error:", error);
            return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
        }
    }