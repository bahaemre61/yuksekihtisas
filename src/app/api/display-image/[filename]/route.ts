import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> } // Params artık bir Promise
) {
  try {
    // 1. Params'ı await ile çözüyoruz
    const resolvedParams = await params;
    const filename = resolvedParams.filename;

    // 2. Güvenlik: Üst dizinlere sızmayı engelle
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ msg: 'Geçersiz dosya adı' }, { status: 400 });
    }

    // 3. Dosya yolunu belirle 
    // Not: Eğer dosyaları public dışına taşıdıysan burası doğru. 
    // Hala public içindeyse 'uploads' yerine 'public', 'uploads' yazmalısın.
    const filePath = path.join(process.cwd(), 'uploads', filename);

    // 4. Dosya varlık kontrolü
    if (!fs.existsSync(filePath)) {
      console.log("Dosya bulunamadı:", filePath);
      return NextResponse.json({ msg: 'Resim sunucuda bulunamadı' }, { status: 404 });
    }

    // 5. Dosyayı oku ve gönder
    const fileBuffer = fs.readFileSync(filePath);
    
    // Uzantıya göre Content-Type belirleme
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error: any) {
    console.error("Görsel API Hatası:", error.message);
    return NextResponse.json({ msg: 'Sunucu hatası', error: error.message }, { status: 500 });
  }
}