import { NextResponse, NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User from "@/src/lib/models/User"; 
import { getAuthenticatedUser } from "@/src/lib/auth"; 

export async function PATCH(request: NextRequest) {
    try {
        await connectToDatabase();

        const { user, error } = getAuthenticatedUser(request as any);
        if (error) return error;

        const body = await request.json();
        const { status } = body;

        const validStatuses = ['available', 'busy'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Geçersiz statü" }, { status: 400 });
        }

        const updatedDriver = await User.findByIdAndUpdate(
            user.id,
            { driverStatus: status },
            { new: true } 
        );

        if (!updatedDriver) {
            return NextResponse.json({ error: "Şoför bulunamadı" }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Şoför durumu ${status} olarak güncellendi.`,
            status: updatedDriver.driverStatus 
        });

    } catch (err: any) {
        console.error("Statü güncelleme hatası:", err.message);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}