import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import RiskForm from '@/src/lib/models/RiskForm';
import '@/src/lib/models/User';
import { COMMISSION_ROLES, INTERNAL_CONTROL_ROLES, canReviewAll } from '@/src/lib/riskConfig';
import { sanitizeIcKontrol, sanitizeIzleme, sanitizeKomisyon, sanitizeMain } from '@/src/lib/riskSanitize';

type Ctx = { params: Promise<{ id: string }> };

const isAdmin = (role?: string) => role === 'admin';
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function GET(request: NextRequest, { params }: Ctx) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ msg: 'Geçersiz ID.' }, { status: 400 });

    try {
        await connectToDatabase();
        const form = await RiskForm.findById(id)
            .populate('createdBy', 'name')
            .populate('komisyon.degerlendiren', 'name')
            .populate('izleme.guncelleyen', 'name')
            .populate('icKontrol.degerlendiren', 'name');
        if (!form) return NextResponse.json({ msg: 'Kayıt bulunamadı.' }, { status: 404 });

        const isOwner = String(form.createdBy?._id) === user.id;
        if (!isOwner && !canReviewAll(user.role)) {
            return NextResponse.json({ msg: 'Bu kaydı görüntüleme yetkiniz yok.' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            data: form,
            permissions: {
                editMain: isOwner || isAdmin(user.role),
                editKomisyon: COMMISSION_ROLES.includes(user.role),
                editIzleme: isOwner || COMMISSION_ROLES.includes(user.role),
                editIcKontrol: INTERNAL_CONTROL_ROLES.includes(user.role)
            }
        });
    } catch (err) {
        console.error('RiskForm get error:', err);
        return NextResponse.json({ msg: 'Kayıt getirilemedi.' }, { status: 500 });
    }
}

// body: { section: 'main' | 'komisyon' | 'izleme' | 'icKontrol', data: {...} }
export async function PUT(request: NextRequest, { params }: Ctx) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ msg: 'Geçersiz ID.' }, { status: 400 });

    try {
        const body = await request.json();
        await connectToDatabase();

        const form = await RiskForm.findById(id).select('createdBy');
        if (!form) return NextResponse.json({ msg: 'Kayıt bulunamadı.' }, { status: 404 });
        const isOwner = String(form.createdBy) === user.id;

        let update: Record<string, unknown> = {};
        let parsed: { data?: Record<string, unknown>; error?: string };

        switch (body?.section) {
            case 'main':
                if (!isOwner && !isAdmin(user.role)) return NextResponse.json({ msg: 'Yetkiniz yok.' }, { status: 403 });
                parsed = sanitizeMain(body.data);
                if (parsed.data) update = parsed.data;
                break;
            case 'komisyon':
                if (!COMMISSION_ROLES.includes(user.role)) return NextResponse.json({ msg: 'Yalnızca komisyon değerlendirebilir.' }, { status: 403 });
                parsed = sanitizeKomisyon(body.data);
                if (parsed.data) update = { ...parsed.data, 'komisyon.degerlendiren': user.id, 'komisyon.degerlendirmeTarihi': new Date() };
                break;
            case 'izleme':
                if (!isOwner && !COMMISSION_ROLES.includes(user.role)) return NextResponse.json({ msg: 'Yetkiniz yok.' }, { status: 403 });
                parsed = sanitizeIzleme(body.data);
                if (parsed.data) update = { ...parsed.data, 'izleme.guncelleyen': user.id, 'izleme.guncellemeTarihi': new Date() };
                break;
            case 'icKontrol':
                if (!INTERNAL_CONTROL_ROLES.includes(user.role)) return NextResponse.json({ msg: 'Yalnızca iç kontrol değerlendirebilir.' }, { status: 403 });
                parsed = sanitizeIcKontrol(body.data);
                if (parsed.data) update = { ...parsed.data, 'icKontrol.degerlendiren': user.id, 'icKontrol.degerlendirmeTarihi': new Date() };
                break;
            default:
                return NextResponse.json({ msg: 'Geçersiz bölüm.' }, { status: 400 });
        }

        if (parsed.error || !parsed.data) return NextResponse.json({ msg: parsed.error || 'Geçersiz veri.' }, { status: 400 });

        await RiskForm.updateOne({ _id: id }, { $set: clean(update) });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('RiskForm update error:', err);
        return NextResponse.json({ msg: 'Kayıt güncellenemedi.' }, { status: 500 });
    }
}
