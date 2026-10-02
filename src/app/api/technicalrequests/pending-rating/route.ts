import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import TechnicalRequest from '@/src/lib/models/TechnicalRequest';
import '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { RATING_START_DATE } from '@/src/lib/ratingConfig';

// Kullanıcının tamamlanmış ama henüz değerlendirmediği teknik talepleri (en yeni 5)
export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();

        const pending = await TechnicalRequest.find({
            user: user.id,
            status: 'completed',
            completedAt: { $gte: RATING_START_DATE }, // eski talepler değerlendirmeye düşmez
            'rating.score': { $exists: false }
        })
            .sort({ completedAt: -1, updatedAt: -1 })
            .limit(5)
            .select('title completedAt technicalStaff')
            .populate('technicalStaff', 'name');

        return NextResponse.json({ success: true, data: pending }, { status: 200 });
    } catch (err) {
        console.error('Pending rating error:', err);
        return NextResponse.json({ msg: 'Sunucu hatası oluştu' }, { status: 500 });
    }
}
