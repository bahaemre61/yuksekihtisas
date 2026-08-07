import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type: rawType } = await params;
    const type = decodeURIComponent(rawType).trim();

    const publicDir = path.join(process.cwd(), 'public');
    const templatesDir = path.join(publicDir, 'templates');

    // 4 Şablon Eşleşme Haritası
    const templateConfig: Record<string, { index: number; defaultName: string; title: string; subtitle: string }> = {
      '0': { index: 0, defaultName: '1_İş_Akış_Şablonu.docx', title: 'İŞ AKIŞ ŞABLONU VE SÜREÇ TANIMI', subtitle: 'Birim İş Akış Adımları ve Onay Süreçleri Formu' },
      'is-akis': { index: 0, defaultName: '1_İş_Akış_Şablonu.docx', title: 'İŞ AKIŞ ŞABLONU VE SÜREÇ TANIMI', subtitle: 'Birim İş Akış Adımları ve Onay Süreçleri Formu' },

      '1': { index: 1, defaultName: '2_Organizasyon_Şeması_Şablonu_1.docx', title: 'ORGANİZASYON ŞEMASI ŞABLONU 1', subtitle: 'Birim Personel Görev Tanımı ve Yetki Şeması' },
      'gorev-yetki': { index: 1, defaultName: '2_Organizasyon_Şeması_Şablonu_1.docx', title: 'ORGANİZASYON ŞEMASI ŞABLONU 1', subtitle: 'Birim Personel Görev Tanımı ve Yetki Şeması' },

      '2': { index: 2, defaultName: '3_Organizasyon_Şeması_Şablonu_2.docx', title: 'ORGANİZASYON ŞEMASI ŞABLONU 2', subtitle: 'Hiyerarşik Görev ve Birim Şeması Formu' },
      'rapor': { index: 2, defaultName: '3_Organizasyon_Şeması_Şablonu_2.docx', title: 'ORGANİZASYON ŞEMASI ŞABLONU 2', subtitle: 'Hiyerarşik Görev ve Birim Şeması Formu' },

      '3': { index: 3, defaultName: '4_Boş_Doküman_Şablonu.docx', title: 'KURUMSAL BOŞ DOKÜMAN ŞABLONU', subtitle: 'Standart Kurumsal Uygulama ve Metin Dokümanı' },
      'prosedur': { index: 3, defaultName: '4_Boş_Doküman_Şablonu.docx', title: 'KURUMSAL BOŞ DOKÜMAN ŞABLONU', subtitle: 'Standart Kurumsal Uygulama ve Metin Dokümanı' }
    };

    const selectedInfo = templateConfig[type] || {
      index: 0,
      defaultName: '1_Doküman_Şablonu.docx',
      title: 'DOKÜMAN ŞABLONU',
      subtitle: 'Yüksek İhtisas Üniversitesi Doküman Formu'
    };

    let targetFilePath = '';
    let finalTurkishFileName = selectedInfo.defaultName;

    if (fs.existsSync(templatesDir)) {
      const filesInDir = fs.readdirSync(templatesDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.docx' || ext === '.doc';
      });

      if (filesInDir.length > 0) {
        // İndeks veya dosya adına göre eşleştir
        const targetIndex = Math.min(selectedInfo.index, filesInDir.length - 1);
        const diskFileName = filesInDir[targetIndex];
        targetFilePath = path.join(templatesDir, diskFileName);
        finalTurkishFileName = diskFileName;
      }
    }

    if (targetFilePath && fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      const fileBuffer = fs.readFileSync(targetFilePath);
      const ext = path.extname(targetFilePath).toLowerCase();
      const contentType = ext === '.doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const asciiFallback = finalTurkishFileName
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .replaceAll(/[^a-zA-Z0-9._-]/g, '_');

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(finalTurkishFileName)}`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Yedek XML Şablonu Oluşturma
    const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="003366"/></w:rPr>
        <w:t>${selectedInfo.title}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="24"/><w:color w:val="666666"/></w:rPr>
        <w:t>${selectedInfo.subtitle}</w:t>
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
    const asciiFallback = selectedInfo.defaultName
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .replaceAll(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(selectedInfo.defaultName)}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Template Download Error:', error);
    return NextResponse.json({ msg: 'Şablon indirilemedi' }, { status: 500 });
  }
}
