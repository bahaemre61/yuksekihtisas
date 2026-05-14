import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Meeting from "@/src/lib/models/MeetingSchema";
import { MeetingStatus } from "@/src/lib/models/MeetingSchema";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrSecret, guestName } = body;

        const { user } = getAuthenticatedUser(request);

        if (!user && !guestName) {
            return NextResponse.json({ 
                msg: 'Lütfen giriş yapın veya misafir olarak katılmak için adınızı belirtin.',
                requireGuestName: true 
            }, { status: 401 });
        }

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

        if (user) {
            const isAlreadyAttendee = meeting.attendees.some((attendee: any) => 
                !attendee.isGuest && attendee.user && attendee.user.toString() === user.id
            );

            if(isAlreadyAttendee){
                return NextResponse.json({ success: true, msg: 'Zaten bu toplantıya katıldınız.', meetingTitle: meeting.title }, { status: 400 });
            }
            meeting.attendees.push({ user: user.id, isGuest: false, checkInTime: new Date() });
        } else {
            // Guest join logic
            meeting.attendees.push({ guestName, isGuest: true, checkInTime: new Date() });
        }

        await meeting.save();

        return NextResponse.json({ success: true, msg: 'Toplantıya başarıyla katıldınız.', meetingTitle: meeting.title }, { status: 200 });
    }catch(error){
        console.error("Toplantıya katılırken hata oluştu:", error);
        return NextResponse.json({ msg: 'Toplantıya katılma sırasında bir hata oluştu.' }, { status: 500 });
    }
}