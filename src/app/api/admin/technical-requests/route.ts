import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import "@/src/lib/models/User";
import { categoryFilter, manageableCategories, parseCategory } from "@/src/lib/techAccess";

export async function GET(request: NextRequest) {
    try {
        const { user, error } = getAuthenticatedUser(request);
        if (error) return error;

        // admin her iki kategoriyi, supervisor/techamir teknik servisi, itadmin bilgi işlemi görür
        const allowed = manageableCategories(user.role);
        if (allowed.length === 0) {
            return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const showCancelled = searchParams.get('showCancelled');
        const requested = parseCategory(searchParams.get('category'));
        const categories = requested && allowed.includes(requested) ? [requested] : allowed;

        await connectToDatabase();

        let query: any = { ...categoryFilter(categories) };

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