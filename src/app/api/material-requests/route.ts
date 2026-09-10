import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

    // Geçmişte kalanı 0 olmadan approved yapılmış kayıtları kısmi teslimata geçir
    await MaterialRequest.updateMany(
      { status: 'approved', remainingQuantity: { $gt: 0 } },
      { $set: { status: 'partially_delivered' } }
    );

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

    await connectToDatabase();

    const locationVal = (body.location || 'Yüksek İhtisas Tıp Fakültesi (100.Yıl Yerleşkesi)').trim();

    // Tam İstenen İş Kodu Formatı (Örn: 20262027-04-TIP, 20262027-01-BLGT)
    const currentYear = new Date().getFullYear();
    const academicPeriod = `${currentYear}${currentYear + 1}`; // Örn: 20262027

    // Bölgeler (TIP, BLGT, BGLC, MRKZ vb.) farklı dahi olsa sayı global olarak daima artmalıdır (örn: 20262027-xx-TIP -> 20262027-(xx+1)-BLGT)
    const existingBatches: (string | null)[] = await MaterialRequest.distinct('batchId');
    let maxSeq = 0;

    for (const bId of existingBatches) {
      if (!bId || typeof bId !== 'string') continue;
      const parts = bId.split('-');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let candidateSeq = maxSeq + 1;
    // Çakışma olmaması için herhangi bir bölgede bu numaranın kullanılıp kullanılmadığını doğrula
    while (
      existingBatches.some(
        (b) =>
          b &&
          typeof b === 'string' &&
          (b.startsWith(`${academicPeriod}-${String(candidateSeq).padStart(2, '0')}-`) ||
            b.startsWith(`${academicPeriod}-${candidateSeq}-`) ||
            b.includes(`-${String(candidateSeq).padStart(2, '0')}-`))
      )
    ) {
      candidateSeq++;
    }

    const seqNum = String(candidateSeq).padStart(2, '0');

    let locCode = 'TIP';
    const upperLoc = locationVal.toUpperCase();

    if (upperLoc.includes('100.YIL') || upperLoc.includes('100YIL')) {
      locCode = upperLoc.includes('TIP') ? 'TIP' : '100YIL';
    } else if (upperLoc.includes('TIP')) {
      locCode = 'TIP';
    } else if (upperLoc.includes('BALGAT') || upperLoc.includes('BLGT')) {
      locCode = 'BLGT';
    } else if (upperLoc.includes('BAĞLUM') || upperLoc.includes('BAGLUM') || upperLoc.includes('BGLC')) {
      locCode = 'BGLC';
    } else if (upperLoc.includes('REKTÖR') || upperLoc.includes('MERKEZ')) {
      locCode = 'MRKZ';
    } else {
      locCode = upperLoc.replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'YRLSK';
    }

    const generatedBatchId = body.batchId || `${academicPeriod}-${seqNum}-${locCode}`;

    let requesterId = user.id && mongoose.Types.ObjectId.isValid(user.id) ? user.id : null;
    if (!requesterId) {
      try {
        const dbUser = await User.findOne({ $or: [{ email: (user as any).email }, { name: user.name }] });
        if (dbUser) {
          requesterId = dbUser._id;
        } else {
          const firstUser = await User.findOne({});
          if (firstUser) requesterId = firstUser._id;
        }
      } catch (e) {
        console.warn('Requester lookup failed:', e);
      }
    }

    // Çoklu malzeme talebi (items dizisi) desteği
    if (Array.isArray(body.items) && body.items.length > 0) {
      for (const item of body.items) {
        if (!item.materialType || !item.materialName || !item.quantity || !item.unit) {
          return NextResponse.json(
            { msg: 'Eksik bilgi: Her malzeme için cins, ad, miktar ve birim zorunludur.' },
            { status: 400 }
          );
        }
        if (Number(item.quantity) <= 0) {
          return NextResponse.json({ msg: 'Miktar 0\'dan büyük olmalıdır.' }, { status: 400 });
        }
      }

      const batchDesc = (body.description || body.batchDescription || '').trim();
      const specNote = (body.specification || '').trim();
      const specFileUrl = (body.specificationFileUrl || '').trim();
      const specFileName = (body.specificationFileName || '').trim();

      const docsToCreate = body.items.map((item: any) => ({
        batchId: generatedBatchId,
        requester: requesterId,
        location: item.location ? item.location.trim() : locationVal,
        materialType: item.materialType.trim(),
        materialName: item.materialName.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim(),
        description: item.description ? item.description.trim() : batchDesc,
        specification: item.specification ? item.specification.trim() : specNote,
        specificationFileUrl: item.specificationFileUrl ? item.specificationFileUrl.trim() : specFileUrl,
        specificationFileName: item.specificationFileName ? item.specificationFileName.trim() : specFileName,
        givenQuantity: 0,
        remainingQuantity: Number(item.quantity),
        status: 'pending_supervisor',
      }));

      const createdDocs = await MaterialRequest.insertMany(docsToCreate);
      const ids = createdDocs.map((doc) => doc._id);

      const populated = await MaterialRequest.find({ _id: { $in: ids } })
        .populate('requester', 'name email role');

      return NextResponse.json(populated, { status: 201 });
    }

    // Tekli malzeme talebi (fallback)
    const { materialType, materialName, quantity, unit, description, specification, specificationFileUrl, specificationFileName, location } = body;

    if (!materialType || !materialName || !quantity || !unit) {
      return NextResponse.json(
        { msg: 'Eksik bilgi: Malzemenin cinsi, malzeme adı, miktar ve birim ölçeği zorunludur.' },
        { status: 400 }
      );
    }

    if (Number(quantity) <= 0) {
      return NextResponse.json({ msg: 'Miktar 0\'dan büyük olmalıdır.' }, { status: 400 });
    }

    const newRequest = await MaterialRequest.create({
      batchId: generatedBatchId,
      requester: requesterId,
      location: location ? location.trim() : locationVal,
      materialType: materialType.trim(),
      materialName: materialName.trim(),
      quantity: Number(quantity),
      unit: unit.trim(),
      givenQuantity: 0,
      remainingQuantity: Number(quantity),
      description: description ? description.trim() : '',
      specification: specification ? specification.trim() : '',
      specificationFileUrl: specificationFileUrl ? specificationFileUrl.trim() : '',
      specificationFileName: specificationFileName ? specificationFileName.trim() : '',
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
