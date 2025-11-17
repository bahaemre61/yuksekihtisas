import { NextRequest , NextResponse } from "next/server";
import {parse} from 'cookie';
import jwt from 'jsonwebtoken';
import { UserRole } from "./models/User";

export interface JwtPayload{
    id : string;
    name : string;
    role : UserRole;
}

type AuthResult = 
| {user : JwtPayload; error : null}
| {user: null; error: NextResponse};

export function getAuthenticatedUser(request: NextRequest): AuthResult {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return { 
        user: null, 
        error: NextResponse.json({ msg: 'Yetkisiz: Cookie bulunamadı' }, { status: 401 }) 
      };
    }

    const allCookies = parse(cookieHeader);
    const token = allCookies.token;

    if (!token) {
      return { 
        user: null, 
        error: NextResponse.json({ msg: 'Yetkisiz: Token bulunamadı' }, { status: 401 }) 
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    return { user: decoded, error: null };

  } catch (error) {
    return { 
      user: null, 
      error: NextResponse.json({ msg: 'Yetkisiz: Geçersiz veya süresi dolmuş token' }, { status: 401 }) 
    };
  }
}