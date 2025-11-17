import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User from "@/src/lib/models/User";
import { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";


export async function PUT(request: NextRequest) {
    const {user, error} = getAuthenticatedUser(request);
    if(error) return error

    if(user.role !== UserRole.DRIVER){
            return NextResponse.json({ msg : 'Yasak : Sadece  şoförler durum güncelleyebilir'}, {status : 403});
        }
    try{         
        const { status } = await request.json();
        if(status !== 'available' && status !== 'busy'){
            return NextResponse.json({msg : 'Geçersiz durum. Sadece müsait veya meşgül olmalı'}, {status : 400});
        }

        await connectToDatabase();
        const updatedUser = await User.findByIdAndUpdate(
            user.id,
            { driverStatus : status},
            { new : true}
        ).select('name role driverStatus');
        if(!updatedUser)
        {
            return NextResponse.json({msg : 'Kullanıcı bulunamadı'}, {status : 404});
        }
        return NextResponse.json(updatedUser, {status : 200});
    }catch (error){  
        console.error(error);
        return NextResponse.json({msg : 'Sunucu hatası'}, {status : 500});
    }

    
}