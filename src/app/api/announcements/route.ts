import { NextResponse} from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Announcement from "@/src/lib/models/Announcement";
import { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {
    const {error} = getAuthenticatedUser(request);
    if(error) return error;

    try{
        await connectToDatabase();

        const announcements = await Announcement.find().sort({createdAt : -1}).limit(20);
        return NextResponse.json(announcements, {status : 200});
    }catch(err){
        return NextResponse.json({ msg : 'Sunucu Hatası'}, {status : 500});
    }
}

export async function POST(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== UserRole.ADMIN)
    {
        return NextResponse.json({msg : "Sadece adminler duyuru yayınlayabilir."}, {status : 403});
    }

    try{
        const {title, content, priority} = await request.json();

        if(!title || !content){
            return NextResponse.json({msg: 'Başlık ve içerik zorunludur'}, {status : 403});
        }
        await connectToDatabase();

        const newAnnouncement = new Announcement({title, content, priority});
        await newAnnouncement.save();

        return NextResponse.json(newAnnouncement, {status : 201});
    }catch(err){
        return NextResponse.json({msg : 'Sunucu hatası'}, {status : 500});
    }
}