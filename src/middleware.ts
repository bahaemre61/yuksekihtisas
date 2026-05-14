import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token');
    const { pathname } = request.nextUrl;

    // Eğer token yoksa ve korunan bir sayfaya gitmeye çalışıyorsa
    // Misafirlerin toplantıya katılabilmesi için /meeting/join/ yollarını serbest bırakıyoruz
    if (!token && (pathname.startsWith('/dashboard') || (pathname.startsWith('/meeting') && !pathname.startsWith('/meeting/join')))) {
        // Gidilmek istenen orijinal adresi alıyoruz
        const loginUrl = new URL('/login', request.url);
        // "callbackUrl" parametresi olarak ekliyoruz
        loginUrl.searchParams.set('callbackUrl', pathname);

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/meeting/join/:path*'],
};

