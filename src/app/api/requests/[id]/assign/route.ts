import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {parse} from 'cookie';
import jwt from 'jsonwebtoken';
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import User from "@/src/lib/models/User";
import { UserRole } from "@/src/lib/models/User";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import mongoose from "mongoose";

interface JwtPayload{
    id: string;
    role : UserRole;
}

export async function PUT(request:NextRequest, {params} : {params : {id : string}}) {
    try{
        const cookieHeader = request.headers.get('cookie');
        if(!cookieHeader){
            return NextResponse.json({msg : 'Yetkisiz : Cookie bulunamadı.'}, {status:  401});
        }
        const allCookies = parse(cookieHeader);
        const token = allCookies.token;

        if(!token)
        {
             return NextResponse.json({msg : 'Yetkisiz : Token bulunamadı.'}, {status:  401});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const driverId = decoded.id;
        const driverRole = decoded.role

        if(driverRole !== UserRole.DRIVER)
        {
            return NextResponse.json({msg : 'Yasak: Bu işlem için yetkiniz yok'}, {status : 403});
        }

        const requestId = params.id;

        if(!mongoose.Types.ObjectId.isValid(requestId)){
            return NextResponse.json({msg : 'Geçersiz Talep ID'},{status : 400});
        }

        await connectToDatabase();


        // const driver = await User.findById(driverId);
        // if(!driver){
        //     return NextResponse.json({msg : 'Şoför bulunamadı'},{status : 404});
        // }
        // if(driver.driverStatus === 'busy'){
        //     return NextResponse.json({msg : 'Zaten meşgulsünüz  '})
        // }

        const updatedRequest = await VehicleRequest.findOneAndUpdate({
            _id: requestId,
            status : RequestStatus.PENDING
        },
        {
            status: RequestStatus.ASSIGNED,
            assignedDriver: driverId
        },
        {new : true}
    );
    if (!updatedRequest) {
      return NextResponse.json({ msg: 'Bu talep artık mevcut değil (başka bir şoför tarafından alınmış olabilir).' }, { status: 400 });
    }

    return NextResponse.json(updatedRequest, { status: 200 });

    }catch(error){

        if(error instanceof jwt.JsonWebTokenError)
        {
            return NextResponse.json({ msg: 'Yetkisiz: Geçersiz token' }, { status: 401 });
        }
        console.error(error);
        return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });    
    }
}