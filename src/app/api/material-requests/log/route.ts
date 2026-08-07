import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import MaterialRequestLog from '@/src/lib/models/MaterialRequestLog';
import User from '@/src/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    await connectToDatabase();

    const query: any = {};
    if (batchId) {
      query.batchId = batchId;
    }

    const logs = await MaterialRequestLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    const inspectCount = await MaterialRequestLog.countDocuments({ ...query, action: 'INSPECT' });
    const downloadCount = await MaterialRequestLog.countDocuments({ ...query, action: 'DOWNLOAD' });

    return NextResponse.json({
      logs,
      counts: {
        inspectCount,
        downloadCount,
        totalClicks: inspectCount + downloadCount
      }
    });
  } catch (err: any) {
    console.error('MaterialRequestLog GET Error:', err);
    return NextResponse.json({ msg: 'Loglar getirilemedi', error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { batchId, requestId, action, actionDetails } = body;

    if (!action || !['INSPECT', 'DOWNLOAD', 'REVIEW_APPROVE', 'REVIEW_REJECT', 'RELEASE_INSPECT'].includes(action)) {
      return NextResponse.json({ msg: 'Geçersiz aksiyon türü.' }, { status: 400 });
    }

    await connectToDatabase();

    const isValidUserId = user.id && mongoose.Types.ObjectId.isValid(user.id);
    const isValidRequestId = requestId && mongoose.Types.ObjectId.isValid(requestId);

    let dbUser = null;
    if (isValidUserId) {
      try {
        dbUser = await User.findById(user.id);
      } catch (e) {
        console.warn('User findById lookup skipped or failed:', e);
      }
    }

    const newLog = await MaterialRequestLog.create({
      batchId: batchId || '',
      requestId: isValidRequestId ? requestId : undefined,
      user: isValidUserId ? user.id : undefined,
      userName: dbUser?.name || user.name || 'Kullanıcı',
      userEmail: dbUser?.email || (user as any).email || 'kullanici@yuksekihtisas.edu.tr',
      userRole: dbUser?.role || user.role || 'user',
      action,
      actionDetails: actionDetails || ''
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (err: any) {
    console.error('MaterialRequestLog POST Error:', err);
    return NextResponse.json({ msg: 'Log kaydedilemedi', error: err.message }, { status: 500 });
  }
}
