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
        const { requestId, technicianIds } = body; 

    if (!requestId || !technicianIds || !Array.isArray(technicianIds)) {
      return NextResponse.json({ success: false, message: 'Eksik veya hatalı veri.' }, { status: 400 });
    }

    const updatedRequest = await TechnicalRequest.findByIdAndUpdate(
      requestId,
      { 
        technicalStaff: technicianIds,
        status: 'assigned'
      },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updatedRequest });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}