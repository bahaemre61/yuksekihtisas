import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { getTaskActor } from '@/src/lib/taskAccess';

// Görev atanabilecek kişiler: kendisi + hiyerarşide altındakiler (admin için tüm aktif kullanıcılar)
export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();
        const actor = await getTaskActor(user.id, user.role);

        const query = actor.isAdmin
            ? { isActive: { $ne: false } }
            : { _id: { $in: [actor.id, ...Array.from(actor.downline)] }, isActive: { $ne: false } };

        const users = await User.find(query).select('name role').sort({ name: 1 });

        return NextResponse.json(
            users.map((u) => ({ _id: String(u._id), name: u.name, role: u.role, isMe: String(u._id) === actor.id })),
            { status: 200 }
        );
    } catch (err) {
        console.error('Assignable users error:', err);
        return NextResponse.json({ msg: 'Kullanıcı listesi alınamadı' }, { status: 500 });
    }
}
