import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth";
import User from "@/src/lib/models/User";
import connectToDatabase from "@/src/lib/db";
import { NextResponse } from "next/server";

export async function POST(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    await connectToDatabase();

    await User.findByIdAndUpdate(user.id, { driverStatus : 'busy' });

    return NextResponse.json({msg : 'Görev başarıyla başlatıldı', success : true}, {status : 200});
    
}