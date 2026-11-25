import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User, { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

// Şoför listesi: yalnızca atama yapan yönetim rolleri
export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
        return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
    }

    try {
        await connectToDatabase();
        const drivers = await User.find({ 
            role: UserRole.DRIVER,
            isActive: { $ne: false }
        }).select('name email _id driverStatus');
        
        return NextResponse.json(drivers);
    } catch (error) {
        return NextResponse.json({ msg: "Şoför listesi alınamadı" }, { status: 500 });
    }
}
