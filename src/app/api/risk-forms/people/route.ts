import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import User from '@/src/lib/models/User';

// Süreç sorumlusu / sorumlu kişi seçimi için aktif kullanıcıların yalnızca adları
export async function GET(request: NextRequest) {
    const { error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();
        const users = await User.find({ isActive: { $ne: false } }).select('name').sort({ name: 1 }).limit(1000);
        return NextResponse.json({ success: true, data: users.map((u: { name: string }) => u.name) });
    } catch (err) {
        console.error('Risk people error:', err);
        return NextResponse.json({ msg: 'Liste getirilemedi.' }, { status: 500 });
    }
}
