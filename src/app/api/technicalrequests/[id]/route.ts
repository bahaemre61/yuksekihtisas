import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { manageableCategories, type RequestCategory } from "@/src/lib/techAccess";

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
// ACİL (HIGH) seçebilen roller (talep formundaki kuralla aynı)
const HIGH_PRIORITY_ROLES = ['admin', 'amir', 'supervisor', 'techamir', 'itadmin'];

// Talebin içeriğini düzenler (başlık, açıklama, konum, öncelik). Durum/atama/değerlendirme
// bu uçtan değiştirilemez; onlar için assign, cancel, my-tasks ve rating uçları vardır.
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
        }

        const raw = await request.json();
        const body: Record<string, unknown> = raw && typeof raw === 'object' ? raw : {};

        await connectToDatabase();

        const existingRequest = await TechnicalRequest.findById(id);
        if (!existingRequest) {
            return NextResponse.json({ msg: 'Talep bulunamadı.' }, { status: 404 });
        }

        const category: RequestCategory = existingRequest.category === 'it' ? 'it' : 'technical';
        const isManager = manageableCategories(user.role).includes(category) && user.role !== 'supervisor';
        const isOwner = String(existingRequest.user) === user.id;

        // Sahibi yalnızca bekleyen talebi, yönetici (admin/techamir/itadmin) kendi kategorisini düzenleyebilir
        if (!isManager && !(isOwner && existingRequest.status === 'pending')) {
            return NextResponse.json({ msg: 'Bu talebi güncelleme yetkiniz yok.' }, { status: 403 });
        }

        const update: Record<string, unknown> = {};
        for (const key of ['title', 'description', 'location'] as const) {
            if (typeof body[key] === 'string' && (body[key] as string).trim()) update[key] = (body[key] as string).trim();
        }
        if (body.priority !== undefined) {
            if (typeof body.priority !== 'string' || !PRIORITIES.includes(body.priority)) {
                return NextResponse.json({ msg: 'Geçersiz öncelik.' }, { status: 400 });
            }
            if (body.priority === 'HIGH' && !HIGH_PRIORITY_ROLES.includes(user.role)) {
                return NextResponse.json({ msg: 'Acil öncelik seçme yetkiniz yok.' }, { status: 403 });
            }
            update.priority = body.priority;
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ msg: 'Güncellenecek geçerli alan yok.' }, { status: 400 });
        }

        const updatedRequest = await TechnicalRequest.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        );

        return NextResponse.json({ success: true, data: updatedRequest }, { status: 200 });
    } catch (err: unknown) {
        console.error("Güncelleme Hatası:", err);
        return NextResponse.json({ msg: 'Güncelleme başarısız' }, { status: 500 });
    }
}
