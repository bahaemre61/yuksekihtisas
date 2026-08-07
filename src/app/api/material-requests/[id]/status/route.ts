import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import MaterialRequest from '@/src/lib/models/MaterialRequest';
import User, { UserRole } from '@/src/lib/models/User';

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
    const { action, note } = body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ msg: 'Geçersiz işlem: approve veya reject olmalıdır.' }, { status: 400 });
    }

    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ msg: 'Geçersiz talep ID.' }, { status: 400 });
    }

    const requestItem = await MaterialRequest.findById(id);
    if (!requestItem) {
      return NextResponse.json({ msg: 'Malzeme talebi bulunamadı.' }, { status: 404 });
    }

    const isValidUserId = user.id && mongoose.Types.ObjectId.isValid(user.id);
    let dbUser = null;
    if (isValidUserId) {
      try {
        dbUser = await User.findById(user.id);
      } catch (e) {
        console.warn('User findById lookup skipped or failed:', e);
      }
    }

    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isSupervisor = role === UserRole.SUPERVISOR || role === UserRole.AMIR || role === UserRole.KANIT_SORUMLU || role === UserRole.RAPORTOR;
    const isMaliIsler = role === UserRole.MALI_ISLER;

    // 1. AŞAMA: SUPERVISOR ONAYI
    if (requestItem.status === 'pending_supervisor') {
      if (!isSupervisor && !isAdmin) {
        return NextResponse.json({ msg: 'Bu talebi onaylamak için Supervisor yetkiniz bulunmamaktadır.' }, { status: 403 });
      }

      if (action === 'approve') {
        requestItem.status = 'pending_mali_isler'; // Mali İşler onayına aktar
      } else {
        requestItem.status = 'rejected';
      }

      if (isValidUserId) {
        requestItem.supervisorReviewer = user.id as any;
      }
      requestItem.supervisorNote = note ? note.trim() : '';
      requestItem.supervisorReviewedAt = new Date();
    }
    // 2. AŞAMA: MALİ İŞLER ONAYI
    else if (requestItem.status === 'pending_mali_isler') {
      if (!isMaliIsler && !isAdmin) {
        return NextResponse.json({ msg: 'Bu talebin 2. Aşamasını sadece Mali İşler yetkisine sahip kullanıcılar onaylayabilir.' }, { status: 403 });
      }

      if (requestItem.supervisorReviewer && String(requestItem.supervisorReviewer) === String(user.id) && !isAdmin) {
        return NextResponse.json({ msg: '1. Aşamayı (Genel Sekreterlik) onaylayan kullanıcı 2. aşamayı da onaylayamaz. 2. Aşamayı Mali İşler yetkilisi onaylamalıdır.' }, { status: 403 });
      }

      if (action === 'approve') {
        requestItem.status = 'approved'; // Tam onaylandı
      } else {
        requestItem.status = 'rejected';
      }

      if (isValidUserId) {
        requestItem.maliIslerReviewer = user.id as any;
      }
      requestItem.maliIslerNote = note ? note.trim() : '';
      requestItem.maliIslerReviewedAt = new Date();
    } else {
      return NextResponse.json({ msg: 'Bu talep zaten sonuçlandırılmıştır.' }, { status: 400 });
    }

    await requestItem.save();

    const updated = await MaterialRequest.findById(id)
      .populate('requester', 'name email role')
      .populate('supervisorReviewer', 'name email role')
      .populate('maliIslerReviewer', 'name email role');

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('MaterialRequest Status Update Error:', err);
    return NextResponse.json({ msg: 'Talep durumu güncellenemedi', error: err.message }, { status: 500 });
  }
}
