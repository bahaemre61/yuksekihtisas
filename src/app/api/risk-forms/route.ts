import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import RiskForm from '@/src/lib/models/RiskForm';
import '@/src/lib/models/User';
import { canReviewAll } from '@/src/lib/riskConfig';
import { sanitizeMain } from '@/src/lib/riskSanitize';

// Liste: birim kullanıcısı yalnızca kendi kayıtlarını, komisyon / iç kontrol / admin tümünü görür
export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();
        const query = canReviewAll(user.role) ? {} : { createdBy: user.id };

        const forms = await RiskForm.find(query)
            .select('birim surec riskBaslik riskPuani olasilik etki komisyon.nihaiPuan izleme.guncelDurum izleme.guncelPuan icKontrol.sonuc createdBy createdAt')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(500);

        return NextResponse.json({ success: true, data: forms });
    } catch (err) {
        console.error('RiskForm list error:', err);
        return NextResponse.json({ msg: 'Kayıtlar getirilemedi.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        const parsed = sanitizeMain(await request.json());
        if (!parsed.data) return NextResponse.json({ msg: parsed.error }, { status: 400 });

        await connectToDatabase();
        const created = await RiskForm.create({ ...parsed.data, createdBy: user.id });
        return NextResponse.json({ success: true, id: created._id }, { status: 201 });
    } catch (err) {
        console.error('RiskForm create error:', err);
        return NextResponse.json({ msg: 'Kayıt oluşturulamadı.' }, { status: 500 });
    }
}
