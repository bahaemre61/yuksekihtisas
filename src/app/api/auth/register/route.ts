import {NextResponse} from 'next/server'
import connectToDatabase from '@/src/lib/db'
import User from '@/src/lib/models/User'
import bcrypt from 'bcryptjs'
import { cache } from 'react';

export async function POST(request: Request){
    try{
        const{name, email, password} = await request.json();

        if(!name || !email || !password){
            return NextResponse.json({msg : 'Tüm Alanlar Zorunludur.'}, {status : 400});
        }
        await connectToDatabase();

        const userExists = await User.findOne({ email });
        if(userExists)
        {
            return NextResponse.json({msg : ' Bu E-Posta zaten kullanılıyor.'},{ status : 400 })
        }
        const newUser = new User({
            name,
            email,
            password,
        });

        await newUser.save();

        return NextResponse.json({msg : 'Kullanıcı Başarıyla oluşturuldu.'}, {status: 201})
    
    }catch(error)
    {
        console.error(error);
        return NextResponse.json({msg : 'Sunucu Hatası'},{ status : 500 })
    }

}