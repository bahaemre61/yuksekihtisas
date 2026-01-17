import { NextResponse } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import connectToDatabase from "@/src/lib/db";

import User from "@/src/lib/models/User";

export async function GET() {
    try{
        await connectToDatabase();

        const request = await TechnicalRequest.find({status : 'PENDING'})
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

        return NextResponse.json({sucsess : true, data: request}, {status : 200});
    }catch(error:any){
        return NextResponse.json({success : false, error: error.message}, {status : 500});
    }
}