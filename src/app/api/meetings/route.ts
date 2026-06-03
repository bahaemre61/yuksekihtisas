import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Meeting from "@/src/lib/models/MeetingSchema";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();

        const organizedMeetings = await Meeting.find({ organizer: user.id })
            .populate('attendees.user', 'name surname title') 
            .sort({ createdAt: -1 });

        const attendedMeetings = await Meeting.find({ 
            'attendees.user': user.id, 
            organizer: { $ne: user.id } 
        })
            .populate('attendees.user', 'name surname title') 
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, organizedMeetings, attendedMeetings }, { status: 200 });
    } catch (error: any) {
        console.error("Meetings Fetch Error:", error);
        return NextResponse.json({ msg: 'Toplantılar getirilemedi.' }, { status: 500 });
    }
}