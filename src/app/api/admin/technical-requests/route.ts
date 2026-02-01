import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {
    const{user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== UserRole.ADMIN && user.role !== UserRole.AMIR) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    try{
        await connectToDatabase();

        const allRequests = await TechnicalRequest.find({})
        .sort({ createdAt: -1})
        .populate('user', 'name email')
        .populate('technicalStaff', 'name');

        return NextResponse.json({ success: true, data: allRequests }, { status: 200 });
    }catch(error){
        console.error("Admin Technical Requests Error:", error);
        return NextResponse.json({ error: "Sunucu Hatası" }, { status: 500 });
    }
}


