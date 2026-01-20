import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import connectToDatabase from "@/src/lib/db";
import { getAuthenticatedUser } from "@/src/lib/auth";


export async function PUT(request:NextRequest) {
    
    try{
        const {user,error} = getAuthenticatedUser(request);
        if(error) return error;

        if(user.role !== 'admin' && user.role !== 'amir' && user.role !== 'tech'){
            return NextResponse.json({ msg: 'Yetkisiz erişim.'}, {status : 403});
        }

        await connectToDatabase();

        const body = await request.json();
        const { requestId, technicianId } = body;

        if(!requestId ||! technicianId){
            return NextResponse.json({success : false, msg : 'Eksik Veri'}, {status : 400});
        }

        const updatedRequest = await TechnicalRequest.findByIdAndUpdate(
            requestId,
            {
                 technicalStaff: technicianId,
                 status: 'assigned' },
            { new: true }
        );

        return NextResponse.json({ success: true, msg: 'Teknik personel atandı.', data: updatedRequest }, { status: 200 });

    }catch(err){
        return NextResponse.json({ msg: 'Yetkisiz erişim.'}, {status : 403});
    }
}