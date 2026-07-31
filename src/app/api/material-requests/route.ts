import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import MaterialRequest from '@/src/lib/models/MaterialRequest';
import User, { UserRole } from '@/src/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    await connectToDatabase();

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isSupervisor = role === UserRole.SUPERVISOR || role === UserRole.AMIR || role === UserRole.KANIT_SORUMLU;
    const isMaliIsler = role === UserRole.MALI_ISLER;

    const query: any = {};
    if (!isAdmin && !isSupervisor && !isMaliIsler) {
      query.requester = user.id;
    }

    const requests = await MaterialRequest.find(query)
      .populate('requester', 'name email role')
      .populate('supervisorReviewer', 'name email role')
      .populate('maliIslerReviewer', 'name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json(requests);
  } catch (err: any) {
    console.error('MaterialRequest GET Error:', err);
    return NextResponse.json({ msg: 'Malzeme talepleri getirilemedi', error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { materialType, materialName, quantity, unit, description } = body;

    if (!materialType || !materialName || !quantity || !unit) {
      return NextResponse.json(
        { msg: 'Eksik bilgi: Malzemenin cinsi, malzeme adı, miktar ve birim ölçeği zorunludur.' },
        { status: 400 }
      );
    }

    if (Number(quantity) <= 0) {
      return NextResponse.json({ msg: 'Miktar 0\'dan büyük olmalıdır.' }, { status: 400 });
    }

    await connectToDatabase();

    const newRequest = await MaterialRequest.create({
      requester: user.id,
      materialType: materialType.trim(),
      materialName: materialName.trim(),
      quantity: Number(quantity),
      unit: unit.trim(),
      description: description ? description.trim() : '',
      status: 'pending_supervisor',
    });

    const populated = await MaterialRequest.findById(newRequest._id)
      .populate('requester', 'name email role');

    return NextResponse.json(populated, { status: 201 });
  } catch (err: any) {
    console.error('MaterialRequest POST Error:', err);
    return NextResponse.json({ msg: 'Malzeme talebi oluşturulamadı', error: err.message }, { status: 500 });
  }
}
