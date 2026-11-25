import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth";
import User from "@/src/lib/models/User";
import connectToDatabase from "@/src/lib/db";
import { NextResponse } from "next/server";

export async function POST(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;
        if (user.role !== "driver") {
            return NextResponse.json({ msg: "Yasak: Bu işlem yalnızca şoförler içindir." }, { status: 403 });
        }

    await connectToDatabase();

    await User.findByIdAndUpdate(user.id, { driverStatus : 'busy' });

    return NextResponse.json({msg : 'Görev başarıyla başlatıldı', success : true}, {status : 200});
    
}