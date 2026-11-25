import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import User, {UserRole} from "@/src/lib/models/User";

// Talebin içeriği: sahibi (beklemedeyken) ve yönetim değiştirebilir
const CONTENT_FIELDS = ['willCarryItems', 'fromLocation', 'toLocation', 'purpose', 'startTime', 'endTime'] as const;

function pickContent(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of CONTENT_FIELDS) {
        if (body[key] !== undefined) out[key] = body[key];
    }
    return out;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
        }

        const raw = await request.json();
        const body: Record<string, unknown> = raw && typeof raw === 'object' ? raw : {};

        await connectToDatabase();

        const existingRequest = await VehicleRequest.findById(id);
        if (!existingRequest) {
            return NextResponse.json({ msg: 'Talep bulunamadı.' }, { status: 404 });
        }

        const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
        const isOwner = String(existingRequest.requestingUser) === user.id;
        const isAssignedDriver = !!existingRequest.assignedDriver && String(existingRequest.assignedDriver) === user.id;

        // Yalnızca beyaz listedeki alanlar yazılır; yetkiye göre daraltılır
        const update: Record<string, unknown> = {};

        if (isStaff) {
            Object.assign(update, pickContent(body));
            if (body.priority === 'normal' || body.priority === 'high') update.priority = body.priority;
            if (body.status !== undefined) {
                if (!Object.values(RequestStatus).includes(body.status as never)) {
                    return NextResponse.json({ msg: 'Geçersiz durum.' }, { status: 400 });
                }
                update.status = body.status;
            }
            if (body.assignedDriver !== undefined) {
                if (body.assignedDriver !== null && !mongoose.Types.ObjectId.isValid(String(body.assignedDriver))) {
                    return NextResponse.json({ msg: 'Geçersiz şoför.' }, { status: 400 });
                }
                update.assignedDriver = body.assignedDriver;
            }
        } else if (isAssignedDriver && body.status === RequestStatus.COMPLETED) {
            // Şoför yalnızca kendisine atanan işi tamamlandı yapabilir
            update.status = RequestStatus.COMPLETED;
        } else if (isOwner && existingRequest.status === RequestStatus.PENDING) {
            // Talep sahibi yalnızca bekleyen talebin içeriğini düzenleyebilir
            Object.assign(update, pickContent(body));
        } else {
            return NextResponse.json({ msg: 'Bu talebi güncelleme yetkiniz yok.' }, { status: 403 });
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ msg: 'Güncellenecek geçerli alan yok.' }, { status: 400 });
        }

        const oldDriverId = existingRequest.assignedDriver;

        const updatedRequest = await VehicleRequest.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        );

        if (oldDriverId) {
            const isReleased =
                (update.status === RequestStatus.PENDING) ||
                (update.status === RequestStatus.COMPLETED) ||
                (update.assignedDriver === null);

            if (isReleased) {
                const remainingJobs = await VehicleRequest.countDocuments({
                    assignedDriver: oldDriverId,
                    status: RequestStatus.ASSIGNED,
                    _id: { $ne: id }
                });

                if (remainingJobs === 0) {
                    await User.findByIdAndUpdate(oldDriverId, { driverStatus: 'available' });
                    console.log(`-> Şoförün (${oldDriverId}) başka işi kalmadığı için 'Müsait' yapıldı.`);
                } else {
                    console.log(`-> Şoförün hala ${remainingJobs} işi var, 'Meşgul' kalmaya devam ediyor.`);
                }
            }
        }

        return NextResponse.json(updatedRequest, { status: 200 });

    } catch (error) {
        console.error("Güncelleme Hatası:", error);
        return NextResponse.json({ msg: 'Güncelleme başarısız' }, { status: 500 });
    }
}
