import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type: rawType } = await params;
    const type = decodeURIComponent(rawType);

    const publicDir = path.join(process.cwd(), 'public');
    const templatesDir = path.join(publicDir, 'templates');

    // 1. Tam dosya adı veya doğrudan yol eşleşmesini kontrol et (public/templates/ veya public/)
    const possibleExactPaths = [
      path.join(templatesDir, type),
      path.join(templatesDir, `${type}.docx`),
      path.join(templatesDir, `${type}.doc`),
      path.join(publicDir, type),
      path.join(publicDir, `${type}.docx`),
      path.join(publicDir, `${type}.doc`),
    ];

    for (const p of possibleExactPaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const fileBuffer = fs.readFileSync(p);
        const ext = path.extname(p).toLowerCase();
        const contentType = ext === '.doc'
          ? 'application/msword'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const filename = path.basename(p);

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 2. Takma adlar (alias) ve indeks sırasına göre eşleşme kontrolü
    let defaultFilename = 'Ornek_Dokuman_Sablonu.docx';
    let docTitle = 'GENEL DOKÜMAN ŞABLONU';
    let docSubtitle = 'Yüksek İhtisas Üniversitesi - Doküman Yönetim Sistemi';

    let targetIndex = -1;
    if (type === 'is-akis' || type === '0') {
      targetIndex = 0;
      defaultFilename = 'Is_Akis_Sablonu.docx';
      docTitle = 'İŞ AKIŞ ŞABLONU VE SÜREÇ TANIMI';
      docSubtitle = 'Birim İş Akış Adımları ve Onay Süreçleri Formu';
    } else if (type === 'gorev-yetki' || type === '1') {
      targetIndex = 1;
      defaultFilename = 'Gorev_Yetki_ve_Sorumluluklar_Sablonu.docx';
      docTitle = 'GÖREV, YETKİ VE SORUMLULUKLAR ŞABLONU';
      docSubtitle = 'Birim Personel Görev Tanımı ve Yetki Matrisi';
    } else if (type === 'rapor' || type === '2') {
      targetIndex = 2;
      defaultFilename = 'Faaliyet_ve_Kalite_Rapor_Sablonu.docx';
      docTitle = 'FAALİYET VE KALİTE RAPOR ŞABLONU';
      docSubtitle = 'Dönem Sonu Kalite ve Değerlendirme Raporu';
    } else if (type === 'prosedur' || type === '3') {
      targetIndex = 3;
      defaultFilename = 'Standart_Prosedur_Sablonu.docx';
      docTitle = 'STANDART UYGULAMA PROSEDÜRÜ ŞABLONU';
      docSubtitle = 'Kurumsal Prosedür ve Talimat Dokümanı';
    }

    // public/templates içindeki N. sıradaki dosyayı sunma
    if (fs.existsSync(templatesDir)) {
      const filesInDir = fs.readdirSync(templatesDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.docx' || ext === '.doc';
      });

      if (targetIndex >= 0 && targetIndex < filesInDir.length) {
        const filePath = path.join(templatesDir, filesInDir[targetIndex]);
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.doc'
          ? 'application/msword'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const filename = path.basename(filePath);

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // 3. Klasörde henüz dosya yoksa yedek varsayılan şablon oluştur
    const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="003366"/></w:rPr>
        <w:t>${docTitle}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="24"/><w:color w:val="666666"/></w:rPr>
        <w:t>${docSubtitle}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>=======================================================</w:t></w:r></w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
        <w:t>1. DOKÜMAN GENEL BİLGİLERİ</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>Doküman Adı: [Doküman Adını Buraya Yazınız]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Doküman No: [Doküman Numarasını Buraya Yazınız]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Hazırlayan Birim: [Birim / Departman Adı]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Yürürlük Tarihi: ${new Date().toLocaleDateString('tr-TR')}</w:t></w:r></w:p>
    <w:p><w:r><w:t>=======================================================</w:t></w:r></w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
        <w:t>2. İÇERİK VE SÜREÇ DETAYLARI</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>Lütfen ilgili içerikleri, görev tanımlarını, iş akış adımlarını veya rapor detaylarını bu alana eksiksiz giriniz...</w:t></w:r></w:p>
  </w:body>
</w:wordDocument>`;

    const buffer = Buffer.from(xmlContent, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': `attachment; filename="${defaultFilename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Template Download Error:', error);
    return NextResponse.json({ msg: 'Şablon indirilemedi' }, { status: 500 });
  }
}
