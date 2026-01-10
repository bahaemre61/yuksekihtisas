import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Announcement from "@/src/lib/models/Announcement";
import { UserRole } from "@/src/lib/models/User";
import{ getAuthenticatedUser } from "@/src/lib/auth";


export async function DELETE(
    request : NextRequest,
    {params} : {params : Promise<{id : string}>}
){

    const {id} = await params;
    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== UserRole.ADMIN)
        return NextResponse.json({msg : 'Sadece adminler duyuru silebilir.'}, {status : 403});

    try{
        await connectToDatabase();

        const deletedAnnouncement = await Announcement.findByIdAndDelete(id);
        
        if(!deletedAnnouncement)
            return NextResponse.json({msg : 'Duyuru bulunamadı.'}, {status : 404});

        return NextResponse.json({msg : 'Duyuru silindi.'}, {status : 200});
    }catch(err){
        console.error(err);
        return NextResponse.json({msg : 'Sunucu hatası'}, {status : 500});
    }

}