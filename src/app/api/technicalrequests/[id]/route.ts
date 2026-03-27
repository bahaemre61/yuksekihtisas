import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const { id } = await context.params;
        const body = await request.json();

        await connectToDatabase();

        const existingRequest = await TechnicalRequest.findById(id);
        if (!existingRequest) {
            return NextResponse.json({ msg: 'Talep bulunamadı.' }, { status: 404 });
        }

        const updatedRequest = await TechnicalRequest.findByIdAndUpdate(
            id,
            body,
            { new: true }
        );

        return NextResponse.json({ success: true, data: updatedRequest }, { status: 200 });
    } catch (err: any) {
        console.error("Güncelleme Hatası:", err);
        return NextResponse.json({ msg: 'Güncelleme başarısız' }, { status: 500 });
    }
}
