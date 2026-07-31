import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import DocumentRequest from '@/src/lib/models/DocumentRequest';
import EvidenceSession from '@/src/lib/models/EvidenceSession';
import User, { UserRole } from '@/src/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ msg: 'sessionId parametresi zorunludur.' }, { status: 400 });
    }

    await connectToDatabase();

    const session = await EvidenceSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ msg: 'Oturum bulunamadı.' }, { status: 404 });
    }

    const dbUser = await User.findById(user.id);
    const role = dbUser?.role || user.role;

    const isAdmin = role === UserRole.ADMIN;
    const isCreator = session.createdBy.toString() === user.id;
    const isReporter = session.reporters.some((r: any) => r.toString() === user.id);
    const isSorumluRole = role === UserRole.KANIT_SORUMLU || role === UserRole.SUPERVISOR || role === UserRole.AMIR || role === UserRole.RAPORTOR;

    const canSeeAll = isAdmin || isCreator || isReporter || isSorumluRole;

    const query: any = { sessionId };
    if (!canSeeAll) {
      query.requester = user.id;
    }

    const requests = await DocumentRequest.find(query)
      .populate('requester', 'name email role')
      .populate('evidenceId')
      .sort({ createdAt: -1 });

    return NextResponse.json(requests);
  } catch (err: any) {
    console.error('DocumentRequest GET Error:', err);
    return NextResponse.json({ msg: 'Talepler getirilemedi', error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(req);
    if (error || !user) {
      return error || NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sessionId,
      requestType,
      documentName,
      documentNo,
      reason,
      feedback,
      evidenceId
    } = body;

    if (!sessionId || !requestType || !documentName) {
      return NextResponse.json({ msg: 'Eksik bilgi: Oturum, Talep Türü ve Doküman Adı zorunludur.' }, { status: 400 });
    }

    if (['REVISION', 'REVOCATION'].includes(requestType) && (!documentNo || !documentNo.trim())) {
      return NextResponse.json({ msg: 'Revizyon ve Yürürlükten Kaldırma talepleri için Doküman No zorunludur.' }, { status: 400 });
    }

    await connectToDatabase();

    const newRequest = await DocumentRequest.create({
      sessionId,
      evidenceId: evidenceId || undefined,
      requester: user.id,
      requestDate: new Date(),
      requestType,
      documentName: documentName.trim(),
      documentNo: documentNo ? documentNo.trim() : '',
      reason: reason ? reason.trim() : '',
      feedback: feedback ? feedback.trim() : '',
      status: 'pending'
    });

    const populatedRequest = await DocumentRequest.findById(newRequest._id)
      .populate('requester', 'name email role')
      .populate('evidenceId');

    return NextResponse.json(populatedRequest, { status: 201 });
  } catch (err: any) {
    console.error('DocumentRequest POST Error:', err);
    return NextResponse.json({ msg: 'Talep oluşturulamadı', error: err.message }, { status: 500 });
  }
}
