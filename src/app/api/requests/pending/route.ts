import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {parse} from 'cookie';
import jwt from 'jsonwebtoken';
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import User from "@/src/lib/models/User";
import { UserRole } from "@/src/lib/models/User";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { connect } from "http2";

interface JwtPayload {
    id: string;
    role : UserRole;
}

export async function GET(request:NextRequest) {

    try{
        const cookieHeader = request.headers.get('cookie');
        if(!cookieHeader)
        {
            return NextResponse.json({msg : "Yetkisiz : Cookie bulunamadı"}, {status : 401});
        }
        const allCookies = parse(cookieHeader);
        const token = allCookies.token;
        
        if(!token){
            return NextResponse.json({msg : "Yetkisiz : Token bulunamadı "}, {status : 401});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        if(decoded.role != UserRole.DRIVER && decoded.role != UserRole.ADMIN)
        {
            return NextResponse.json({msg : "Yasak : Bu işlem için yetkiniz yok. "}, {status : 403});
        }

        await connectToDatabase();

        const pendingRequest = await VehicleRequest.find({
            status  : RequestStatus.PENDING
        })
        .populate('requestingUser', 'name email')
        .sort({ startTime: 1});

        return NextResponse.json(pendingRequest, {status : 200});
    }catch(error)
    {
        if(error instanceof jwt.JsonWebTokenError)
        {
            return NextResponse.json({ msg : 'Yetkisiz : Geçersiz token'}, {status : 401});
        }
        console.error(error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
}