import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {

    const {user, error} = getAuthenticatedUser(request);
      if(error) return error

    if(user.role !== 'admin' && user.role !== 'tech')
        return NextResponse.json({msg: 'Yasak: Yetkisiz giriş.'}, {status : 403});

  await connectToDatabase();
  
  const tasks = await TechnicalRequest.find({ 
    technicalStaff: user.id,
    status: 'assigned' 
  }).populate('user', 'name location');

  return NextResponse.json({ success: true, data: tasks });
}

export async function PUT(req: Request) {
  try {
    const { requestId } = await req.json();
    await connectToDatabase();
    
    await TechnicalRequest.findByIdAndUpdate(requestId, {
      status: 'completed',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}