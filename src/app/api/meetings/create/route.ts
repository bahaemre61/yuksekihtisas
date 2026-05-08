import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Meeting from "@/src/lib/models/MeetingSchema";
import { MeetingStatus } from "@/src/lib/models/MeetingSchema";
import { getAuthenticatedUser } from "@/src/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const {
            title,
            description,
            location,
            date
        } = await request.json();

        if (!title || !location || !date) {
            return NextResponse.json(
                { msg: 'Lütfen tüm zorunlu alanları (Başlık, Konum, Tarih) doldurun.' },
                { status: 400 }
            );
        }

        if (new Date(date) < new Date()) {
            return NextResponse.json(
                { msg: 'Toplantı tarihi geçmiş bir zaman olamaz.' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const qrSecret = crypto.randomUUID();

        const newMeeting = new Meeting({
            title,
            description,
            location,
            date,
            organizer: user.id,
            qrSecret,
            status: MeetingStatus.OPEN,
            attendees: [],
            isApproved: false
        });

        const savedMeeting = await newMeeting.save();

        return NextResponse.json(savedMeeting, { status: 201 });

    } catch (error: any) {
        console.error("Meeting Create Error:", error);
        return NextResponse.json(
            { msg: 'Sunucu Hatası', error: error.message },
            { status: 500 }
        );
    }
}