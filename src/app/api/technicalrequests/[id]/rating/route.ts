import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import TechnicalRequest from '@/src/lib/models/TechnicalRequest';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { RATING_START_DATE } from '@/src/lib/ratingConfig';

// Talep sahibi, tamamlanan teknik talebini 1-5 yıldızla değerlendirir (bir kez).
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
        }

        const body = await request.json();
        const score = Number(body.score);
        const comment = String(body.comment ?? '').trim();

        if (!Number.isInteger(score) || score < 1 || score > 5) {
            return NextResponse.json({ msg: 'Puan 1 ile 5 arasında bir tam sayı olmalıdır.' }, { status: 400 });
        }
        if (comment.length > 500) {
            return NextResponse.json({ msg: 'Yorum en fazla 500 karakter olabilir.' }, { status: 400 });
        }

        await connectToDatabase();

        // Atomik güncelleme: sadece kendi, tamamlanmış ve henüz değerlendirilmemiş talep
        const updated = await TechnicalRequest.findOneAndUpdate(
            { _id: id, user: user.id, status: 'completed', completedAt: { $gte: RATING_START_DATE }, 'rating.score': { $exists: false } },
            { $set: { rating: { score, comment, ratedAt: new Date() } } },
            { new: true }
        );

        if (!updated) {
            const existing = await TechnicalRequest.findById(id).select('user status rating completedAt');
            if (!existing) {
                return NextResponse.json({ msg: 'Talep bulunamadı.' }, { status: 404 });
            }
            if (String(existing.user) !== String(user.id)) {
                return NextResponse.json({ msg: 'Sadece kendi talebinizi değerlendirebilirsiniz.' }, { status: 403 });
            }
            if (existing.status !== 'completed') {
                return NextResponse.json({ msg: 'Talep tamamlanmadan değerlendirme yapılamaz.' }, { status: 400 });
            }
            if (!existing.completedAt || existing.completedAt < RATING_START_DATE) {
                return NextResponse.json({ msg: 'Bu talep değerlendirme sistemi öncesinde tamamlandığı için değerlendirilemez.' }, { status: 400 });
            }
            return NextResponse.json({ msg: 'Bu talep zaten değerlendirilmiş.' }, { status: 409 });
        }

        return NextResponse.json({ success: true, rating: updated.rating }, { status: 201 });
    } catch (err) {
        console.error('Rating POST error:', err);
        return NextResponse.json({ msg: 'Değerlendirme kaydedilemedi' }, { status: 500 });
    }
}
