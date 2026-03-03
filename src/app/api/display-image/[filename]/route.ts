import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises'; // Daha modern ve hızlı olması için promises kullanıyoruz
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
      console.log("❌ Resim bulunamadı. Aranan yol:", filePath);
      return NextResponse.json({ msg: 'Görsel sunucuda bulunamadı.' }, { status: 404 });
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
      '.webp': 'image/webp'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 6. Dosyayı gönder
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error: any) {
    console.error("Görsel API Hatası:", error.message);
    return NextResponse.json({ msg: 'Sunucu hatası', error: error.message }, { status: 500 });
  }
}