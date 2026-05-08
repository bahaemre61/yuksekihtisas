import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Meeting from "@/src/lib/models/MeetingSchema";
import { MeetingStatus } from "@/src/lib/models/MeetingSchema";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function POST(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try{
        const { qrSecret } = await request.json();

        if(!qrSecret){
            return NextResponse.json({ msg: 'QR kod bilgisi eksik.' }, { status: 400 });
        }
        await connectToDatabase();

        const meeting = await Meeting.findOne({ qrSecret });

        if(!meeting){
            return NextResponse.json({ msg: 'Geçersiz QR kodu.' }, { status: 404 });
        }

        if(meeting.status !== MeetingStatus.OPEN){
            return NextResponse.json({ msg: 'Bu toplantıya katılım şu anda kapalı.' }, { status: 400 });
        }

        const isAlreadyAttendee = meeting.attendees.some((attendee: any) => attendee.user.toString() === user.id);

        if(isAlreadyAttendee){
            return NextResponse.json({ success: true, msg: 'Zaten bu toplantıya katıldınız.' }, { status: 400 });
        }
        meeting.attendees.push({ user: user.id, checkInTime: new Date() });

        await meeting.save();

        return NextResponse.json({ success: true, msg: 'Toplantıya başarıyla katıldınız.' }, { status: 200 });
    }catch(error){
        console.error("Toplantıya katılırken hata oluştu:", error);
        return NextResponse.json({ msg: 'Toplantıya katılma sırasında bir hata oluştu.' }, { status: 500 });
    }
}