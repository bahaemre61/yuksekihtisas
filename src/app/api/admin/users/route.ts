import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:NextRequest) {
    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== 'admin')
    {
        return NextResponse.json({msg: 'Yasak'}, {status : 403});
    }

    try{
        await connectToDatabase();

        const {searchParams} = new URL(request.url);
        const search = searchParams.get('search');

        let query = {};

        if(search)
        {
            query= {
                $or : [
                    {name : {$regex : search, $options : 'i'}},
                    {email: {$regex: search, $options : 'i'}}
                ]
            };
        }

        const user = await User.find(query)
        .select('-password')
        .sort({createdAt: -1});
        return NextResponse.json(user, {status : 200});

        // const users = await User.find({}).select('-password').sort({createdAt: -1});
        // return NextResponse.json(users, {status : 200});
    }catch(err){
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }
}

export async function POST(request:NextRequest) {
    const {user, error} = getAuthenticatedUser(request);
    if(error) return error;

    if(user.role !== 'admin')
    {
        return NextResponse.json({msg : 'Yasak: Yetkisiz giriş'}, {status : 403});
    }

    try{
        const {name, email ,password ,role} = await request.json();

        await connectToDatabase();

        const exists = await User.findOne({email});

        if(exists)
        {
            return NextResponse.json({ msg : 'Bu e-posta zaten kayıtlı.'}, {status : 400})
        }

        const newUser = new User({
            name,
            email,
            password,
            role: role || 'user',
            driverStatus: role === 'driver' ? 'available' : undefined
        });

        await newUser.save();

        return NextResponse.json({ msg : 'Kullanıcı oluşturuldu.', user: newUser}, {status : 201});
    }catch (err)
    {
        return NextResponse.json({msg : 'Sunucu hatası'}, {status: 500});
    }
}

