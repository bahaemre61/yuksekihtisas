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

const unauthorized = (msg: string): AuthResult => ({
  user: null,
  error: NextResponse.json({ msg }, { status: 401 }),
});

// Token kaynağı: önce mobil istemcinin gönderdiği "Authorization: Bearer <token>",
// yoksa web için httpOnly "token" cookie'si.
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match) return match[1];
  }

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    return parse(cookieHeader).token || null;
  }
  return null;
}

export function getAuthenticatedUser(request: NextRequest): AuthResult {
  try {
    const token = extractToken(request);

    if (!token) {
      return unauthorized('Yetkisiz: Token bulunamadı');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    return { user: decoded, error: null };

  } catch (error) {
    return unauthorized('Yetkisiz: Geçersiz veya süresi dolmuş token');
  }
}
