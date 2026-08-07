import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 1. Güvenlik: Dosya adını temizle (Sadece ismi al, path sızmasını engelle)
    const safeFilename = path.basename(filename);

    // 2. Kök dizindeki 'uploads' klasörüne bakıyoruz
    const filePath = path.join(process.cwd(), 'uploads', safeFilename);

    // 3. Dosya var mı kontrol et
    try {
      await fs.access(filePath);
    } catch {
      console.log("❌ Resim/Dosya bulunamadı. Aranan yol:", filePath);
      return NextResponse.json({ msg: 'Dosya sunucuda bulunamadı.' }, { status: 404 });
    }

    // 4. Dosyayı oku
    const fileBuffer = await fs.readFile(filePath);
    
    // 5. Uzantıya göre Content-Type belirle
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 6. İndirme/Görüntüleme için Dosya Adını Temizleme (Sayı_Dosyaİsmi formatı)
    const searchParams = req.nextUrl.searchParams;
    const customName = searchParams.get('name') || searchParams.get('downloadName');

    let cleanName = customName || safeFilename;
    // Ön takı olarak eklenmiş spec-1770... veya upload-1770... zaman damgalarını temizle
    cleanName = cleanName.replace(/^(spec|upload|file)-\d+-/i, '')
                         .replace(/Boablon/gi, 'Sablon')
                         .replace(/\s+/g, '_');

    if (!cleanName.toLowerCase().endsWith(ext)) {
      cleanName += ext;
    }

    const asciiName = cleanName
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .replaceAll(/[^a-zA-Z0-9._-]/g, '_');

    const isDownload = searchParams.get('download') === 'true' || ext === '.doc' || ext === '.docx';
    const dispositionType = isDownload ? 'attachment' : 'inline';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${dispositionType}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error: any) {
    console.error("Görsel/Dosya API Hatası:", error.message);
    return NextResponse.json({ msg: 'Sunucu hatası', error: error.message }, { status: 500 });
  }
}