import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";


export async function  DELETE(request: NextRequest, {params}: {params: Promise<{id : string}> }) {

    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== 'admin')
        return NextResponse.json({msg: 'Yasak: Yetkisiz giriş.'}, {status : 403});

    try{
        const {id} = await params;
        await connectToDatabase();

        if(id === user.id)
            return NextResponse.json({ msg :'Kendinizi silemezsiniz.'}, {status : 400});
        
        await User.findByIdAndDelete(id);
        return NextResponse.json({msg : 'Kullanıcı silindi'}, {status : 200});

    }catch (err)
    {
        return NextResponse.json({msg :'Sunucu Hatası'}, {status : 500});
    }
}

export async function PUT(request:NextRequest, {params}: {params: Promise<{id : string}>}) {
    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== 'admin')
        return NextResponse.json({ msg: 'Yasak'}, {status : 403});

    try{
        const {id} = await params;
        const {name, email, role} =await request.json();

        await connectToDatabase();

        const updateData: any = {name, email, role};
        if(role === 'driver') updateData.driverStatus = 'available';

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {new : true}).select('-password');

        return NextResponse.json(updatedUser, {status : 200});
    }catch(err){
        return NextResponse.json({msg :'Sunucu Hatası'}, {status : 500});
    }
}