import { NextResponse } from "next/server";
import {serialize} from "cookie";

export async function POST(request:Request) {
    const serializedCookie = serialize('token', '',{
        httpOnly: true,
        secure : process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1,
        path: '/'
    });

    return NextResponse.json(
        {success : true, msg: 'Çıkış Başarılı'},
        {
            status : 200,
            headers:{
                'Set-Cookie' : serializedCookie
            }
        }
    )
    
}