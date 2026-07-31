import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    let filename = 'Ornek_Dokuman_Sablonu.docx';
    let docTitle = 'GENEL DOKÜMAN ŞABLONU';
    let docSubtitle = 'Yüksek İhtisas Üniversitesi - Doküman Yönetim Sistemi';

    if (type === 'is-akis') {
      filename = 'Is_Akis_Sablonu.docx';
      docTitle = 'İŞ AKIŞ ŞABLONU VE SÜREÇ TANIMI';
      docSubtitle = 'Birim İş Akış Adımları ve Onay Süreçleri Formu';
    } else if (type === 'gorev-yetki') {
      filename = 'Gorev_Yetki_ve_Sorumluluklar_Sablonu.docx';
      docTitle = 'GÖREV, YETKİ VE SORUMLULUKLAR ŞABLONU';
      docSubtitle = 'Birim Personel Görev Tanımı ve Yetki Matrisi';
    } else if (type === 'rapor') {
      filename = 'Faaliyet_ve_Kalite_Rapor_Sablonu.docx';
      docTitle = 'FAALİYET VE KALİTE RAPOR ŞABLONU';
      docSubtitle = 'Dönem Sonu Kalite ve Değerlendirme Raporu';
    } else if (type === 'prosedur') {
      filename = 'Standart_Prosedur_Sablonu.docx';
      docTitle = 'STANDART UYGULAMA PROSEDÜRÜ ŞABLONU';
      docSubtitle = 'Kurumsal Prosedür ve Talimat Dokümanı';
    }

    // Geçerli ve açılabilir minimalist bir Word OpenXML (.docx) belgesi içeriği
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
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Template Download Error:', error);
    return NextResponse.json({ msg: 'Şablon indirilemedi' }, { status: 500 });
  }
}
