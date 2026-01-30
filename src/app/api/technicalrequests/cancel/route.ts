import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    await connectToDatabase();

    const { requestId } = await request.json();

    if (!requestId) {
        return NextResponse.json({ msg: 'Talep ID gerekli' }, { status: 400 });
    }

    const requestDoc = await TechnicalRequest.findById(requestId);

    if (!requestDoc) {
        return NextResponse.json({ msg: 'Talep bulunamadı' }, { status: 404 });
    }

    if (requestDoc.user.toString() !== user.id) {
        return NextResponse.json({ msg: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    if (requestDoc.status !== 'pending') {
        return NextResponse.json({ msg: 'Sadece beklemedeki talepler iptal edilebilir.' }, { status: 400 });
    }

    requestDoc.status = 'cancelled';
    await requestDoc.save();

    return NextResponse.json({ success: true, msg: 'Talep iptal edildi' });

  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
  }
}