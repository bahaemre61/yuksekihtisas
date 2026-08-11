import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import MaterialRequest from '@/src/lib/models/MaterialRequest';
import User, { UserRole } from '@/src/lib/models/User';
import MaterialRequestLog from '@/src/lib/models/MaterialRequestLog';

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { batchId, action, note } = await req.json(); // action: 'approve' | 'reject'

    if (!batchId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ msg: 'Geçersiz parametreler: batchId ve geçerli bir action gerekli.' }, { status: 400 });
    }

    await connectToDatabase();

    const isValidUserId = user.id && mongoose.Types.ObjectId.isValid(user.id);
    let dbUser = null;
    if (isValidUserId) {
      try {
        dbUser = await User.findById(user.id);
      } catch (e) {
        console.warn('User lookup skipped:', e);
      }
    }

    const role = dbUser?.role || user.role;
    const isAdmin = role === UserRole.ADMIN;
    const isSupervisor = role === UserRole.SUPERVISOR || role === UserRole.AMIR || role === UserRole.KANIT_SORUMLU || role === UserRole.RAPORTOR;
    const isMaliIsler = role === UserRole.MALI_ISLER;

    // batchId'ye ait tüm malzeme taleplerini çek
    const batchItems = await MaterialRequest.find({ batchId });

    if (!batchItems || batchItems.length === 0) {
      return NextResponse.json({ msg: 'Bu işe ait malzeme bulunamadı.' }, { status: 404 });
    }

    let updatedCount = 0;

    for (const item of batchItems) {
      // 1. AŞAMA: SUPERVISOR ONAYI
      if (item.status === 'pending_supervisor') {
        if (!isSupervisor && !isAdmin) continue;

        if (action === 'approve') {
          item.status = 'pending_mali_isler' as any;
        } else {
          item.status = 'rejected' as any;
        }
        if (isValidUserId) {
          item.supervisorReviewer = user.id as any;
        }
        item.supervisorNote = note ? note.trim() : 'Toplu İşlem Onayı';
        item.supervisorReviewedAt = new Date();
        await item.save();
        updatedCount++;
      }
      // 2. AŞAMA: MALİ İŞLER ONAYI
      else if (item.status === 'pending_mali_isler') {
        if (!isMaliIsler && !isAdmin) continue;
        if (item.supervisorReviewer && String(item.supervisorReviewer) === String(user.id) && !isAdmin) continue;

        if (action === 'approve') {
          item.status = 'approved' as any;
        } else {
          item.status = 'rejected' as any;
        }
        if (isValidUserId) {
          item.maliIslerReviewer = user.id as any;
        }
        item.maliIslerNote = note ? note.trim() : 'Toplu İşlem Onayı';
        item.maliIslerReviewedAt = new Date();
        await item.save();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      try {
        await MaterialRequestLog.create({
          batchId,
          user: isValidUserId ? user.id : undefined,
          action: action === 'approve' ? 'REVIEW_APPROVE' : 'REVIEW_REJECT',
          actionDetails: `Toplu İşlem: ${updatedCount} adet malzeme ${action === 'approve' ? 'toplu olarak onaylandı' : 'toplu olarak reddedildi'}`
        });
      } catch (logErr) {
        console.warn('Batch action log record error:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      msg: `${updatedCount} adet malzeme talebi başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.`
    });

  } catch (err: any) {
    console.error('Bulk Status Update Error:', err);
    return NextResponse.json({ msg: 'Toplu onaylama hatası', error: err.message }, { status: 500 });
  }
}
