import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {parse} from "cookie";
import jwt from 'jsonwebtoken';
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { Chokokutai } from "next/font/google";

interface JwtPayload{
    id: string;
}

export async function GET(request:NextRequest) {

    try{

        const cookieHeader = request.headers.get('cookie');

        if(!cookieHeader)
        {
            return NextResponse.json({ msg: 'Yetkisiz: Cookie bulunamadı'},{status : 401});
        }
        const allCookies = parse(cookieHeader);
        const token = allCookies.token;

        if(!token)
        {
            return NextResponse.json({msg : "Yetkisiz : Token bulunamadı"},{status : 401});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const userId = decoded.id;

        await connectToDatabase();

        const myRequests = await VehicleRequest.find({
            requestingUser : userId
        })
        .populate('assignedDriver', 'name')
        .sort({createdAt: -1});

        return NextResponse.json(myRequests, {status:200})
    }catch (error){
        if(error instanceof jwt.JsonWebTokenError){
            return NextResponse.json({msg: "Yetkisiz : Geçersiz token"}, {status : 401});
        }
        console.error(error);
        return NextResponse.json({msg : "Sunucu Hatası"}, {status : 500});
    }
    
}