import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Meeting from "@/src/lib/models/MeetingSchema";
import { MeetingStatus } from "@/src/lib/models/MeetingSchema";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { UserRole } from "@/src/lib/models/User";


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;
    try {
        // 1. params'ı await ile çözüyoruz (Next.js 15 kuralı)
        const resolvedParams = await params;
        const meetingId = resolvedParams.id;

        const { minutes } = await request.json();

        await connectToDatabase();

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return NextResponse.json({ msg: 'Toplantı bulunamadı.' }, { status: 404 });
        }

        if (meeting.organizer.toString() !== user.id) {
            return NextResponse.json({ msg: 'Bu toplantıyı kapatma yetkiniz yok.' }, { status: 403 });
        }

        meeting.minutes = minutes;
        meeting.status = MeetingStatus.CLOSED;

        await meeting.save();

        return NextResponse.json({
            success: true,
            msg: 'Tutanak kaydedildi ve toplantı başarıyla kapatıldı.'
        });

    } catch (error: any) {
        console.error("Minutes Update Error:", error);
        return NextResponse.json({ msg: 'Sunucu hatası oluştu.' }, { status: 500 });
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const { id } = await params;
        await connectToDatabase();

        const meeting = await Meeting.findById(id).populate('organizer', 'name email role').populate('attendees.user', 'name email role');

        if (!meeting) {
            return NextResponse.json({ msg: 'Toplantı bulunamadı.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, meeting }, { status: 200 });
    } catch (error: any) {
        console.error("Meeting Fetch Error:", error);
        return NextResponse.json({ msg: 'Sunucu hatası oluştu.' }, { status: 500 });
    }

}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const { id } = await params;
        await connectToDatabase();

        const meeting = await Meeting.findById(id);

        if (!meeting) {
            return NextResponse.json({ msg: 'Toplantı bulunamadı.' }, { status: 404 });
        }

        const isOwner = meeting.organizer.toString() === user.id;
        const isAdmin = user.role == UserRole.ADMIN;

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ msg: 'Bu toplantıyı silme yetkiniz yok.' }, { status: 403 });
        }

        await Meeting.findByIdAndDelete(id);

        return NextResponse.json({ success: true, msg: 'Toplantı başarıyla silindi.' }, { status: 200 });
    } catch (error: any) {
        console.error("Meeting Delete Error:", error);
        return NextResponse.json({ msg: 'Sunucu hatası oluştu.' }, { status: 500 });
    }

}