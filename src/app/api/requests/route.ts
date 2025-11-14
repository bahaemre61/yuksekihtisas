import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from 'jsonwebtoken';
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import {parse} from 'cookie'
import { start } from "repl";

interface JwtPayload {
  id: string; // Token'dan gelen kullanıcı ID'si
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');  
        if (!cookieHeader) {
          return NextResponse.json({ msg: 'Yetkisiz: Cookie bulunamadı' }, { status: 401 });
        }
      
        const allCookies = parse(cookieHeader);
        const token = allCookies.token; 
    
        if (!token) {
          return NextResponse.json({ msg: 'Yetkisiz: Token bulunamadı' }, { status: 401 });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const userId = decoded.id;

        const{
            willCarryItems,
            fromLocation,
            toLocation,
            purpose,
            startTime,
            endTime
        }= await request.json();

        if(!fromLocation || !toLocation || !purpose || willCarryItems === undefined || !startTime || !endTime){
            return NextResponse.json({msg : 'Lütfen tüm zorunlu alanları doldurun.'},{status : 400});
        }
        if (new Date(endTime) <= new Date(startTime)){
            return NextResponse.json({msg: 'Dönüş saati, gidiş saatinden sonra olmalıdır.'}, {status : 400});
        }

        await connectToDatabase();

        const newRequest = new VehicleRequest({
        requestingUser: userId,
        willCarryItems,
        fromLocation,
        toLocation,
        purpose,
        startTime,
        endTime,
        status: RequestStatus.PENDING
    });
    const savedRequest = await newRequest.save();
    
    return NextResponse.json(savedRequest, {status : 201});
    }catch(error)
    {
        if(error instanceof jwt.JsonWebTokenError)
        {
            return NextResponse.json({msg : 'Yetkisiz : Geçersiz token'}, {status : 401})
        }
        console.error(error)
        return NextResponse.json({msg : 'Sunucu Hatası'},{status : 500});
    }
}