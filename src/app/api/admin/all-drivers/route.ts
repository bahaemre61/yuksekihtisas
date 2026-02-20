import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User, { UserRole } from "@/src/lib/models/User";

export async function GET() {
    try {
        await connectToDatabase();
        const drivers = await User.find({ 
            role: UserRole.DRIVER 
        }).select('name email _id driverStatus');
        
        return NextResponse.json(drivers);
    } catch (error) {
        return NextResponse.json({ msg: "Şoför listesi alınamadı" }, { status: 500 });
    }
}