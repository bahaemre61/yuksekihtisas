import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import MaterialRequest from '@/src/lib/models/MaterialRequest';
import User, { UserRole } from '@/src/lib/models/User';
import MaterialRequestLog from '@/src/lib/models/MaterialRequestLog';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { materialName, materialType, quantity, unit, description, specification } = body;

    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
    }

    const item = await MaterialRequest.findById(id);
    if (!item) {
      return NextResponse.json({ msg: 'Malzeme talebi bulunamadı.' }, { status: 404 });
    }

    const isRequester = String(item.requester) === String(user.id);
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isRequester && !isAdmin) {
      return NextResponse.json({ msg: 'Sadece kendi oluşturduğunuz malzeme talebini düzenleyebilirsiniz.' }, { status: 403 });
    }

    if (item.status === 'approved') {
      return NextResponse.json({ msg: 'Tamamen onaylanmış malzeme talebi düzenlenemez.' }, { status: 400 });
    }

    // Güncelleme işlemleri
    if (materialName !== undefined) item.materialName = String(materialName).trim();
    if (materialType !== undefined) item.materialType = String(materialType).trim();
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (unit !== undefined) item.unit = String(unit).trim();
    if (description !== undefined) item.description = String(description).trim();
    if (specification !== undefined) item.specification = String(specification).trim();

    await item.save();

    // Log kaydı
    try {
      await MaterialRequestLog.create({
        batchId: item.batchId || `SINGLE-${item._id}`,
        user: user.id && mongoose.Types.ObjectId.isValid(user.id) ? user.id : undefined,
        action: 'INSPECT',
        actionDetails: `Talep sahibi (${user.name || 'Personel'}) tarafından malzeme bilgileri güncellendi (${item.materialName})`
      });
    } catch (lErr) {
      console.warn('Edit log record error:', lErr);
    }

    return NextResponse.json({ success: true, item, msg: 'Malzeme talebi başarıyla güncellendi.' });
  } catch (err: any) {
    console.error('MaterialRequest Edit Error:', err);
    return NextResponse.json({ msg: 'Malzeme talebi düzenlenemedi', error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
    }

    const item = await MaterialRequest.findById(id);
    if (!item) {
      return NextResponse.json({ msg: 'Malzeme talebi bulunamadı.' }, { status: 404 });
    }

    const isRequester = String(item.requester) === String(user.id);
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isRequester && !isAdmin) {
      return NextResponse.json({ msg: 'Sadece kendi oluşturduğunuz malzeme talebini silebilirsiniz.' }, { status: 403 });
    }

    if (item.status === 'approved') {
      return NextResponse.json({ msg: 'Tamamen onaylanmış malzeme talebi silinemez.' }, { status: 400 });
    }

    await MaterialRequest.findByIdAndDelete(id);

    return NextResponse.json({ success: true, msg: 'Malzeme talebi başarıyla silindi.' });
  } catch (err: any) {
    console.error('MaterialRequest Delete Error:', err);
    return NextResponse.json({ msg: 'Malzeme talebi silinemedi', error: err.message }, { status: 500 });
  }
}
