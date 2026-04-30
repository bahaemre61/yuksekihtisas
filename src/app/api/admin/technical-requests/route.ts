import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import User, { UserRole } from "@/src/lib/models/User";

export async function GET(request: NextRequest) {
    try {
        const { user, error } = getAuthenticatedUser(request);
        if (error) return error;

        if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR && user.role !== UserRole.TECHAMIR) {
            return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const showCancelled = searchParams.get('showCancelled');

        await connectToDatabase();

        let query: any = {};

        if (status && status !== 'all') {
            query.status = status;
        } else {
            if (showCancelled === 'false') {
                query.status = { $ne: 'cancelled' };
            }
        }

        const requests = await TechnicalRequest.find(query)
            .populate('user', 'name email')
            .populate('technicalStaff', 'name')
            .sort({ createdAt: -1 });
        return NextResponse.json(requests, { status: 200 });

    } catch (error) {
        console.error("Teknik talep çekme hatası:", error);
        return NextResponse.json({ msg: 'Veriler alınamadı' }, { status: 500 });
    }
}