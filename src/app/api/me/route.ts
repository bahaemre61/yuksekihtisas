import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // <-- NextRequest'i import et
import jwt from 'jsonwebtoken';
import { parse } from 'cookie'; // <-- Cookie'yi manuel parse etmek için

interface JwtPayload {
  id: string;
  name: string;
  role: string;
}

export async function GET(request: NextRequest) { 
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


    return NextResponse.json({
      name: decoded.name,
      role: decoded.role
    });
    
  } catch (error) {
    return NextResponse.json({ msg: 'Yetkisiz: Geçersiz token' }, { status: 401 });
  }
}