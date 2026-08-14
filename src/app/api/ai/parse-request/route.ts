import { NextResponse } from "next/server";
import { generateGeminiJson } from '@/src/lib/gemini';

const MAIN_HUB = "Yüksek İhtisas Üniversitesi - 100. Yıl Yerleşkesi (Tıp Fakültesi)";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const prompt = `
Sen uzman bir lojistik planlayıcısısın.

SENARYO:
- Şirketin ana merkezi: "${MAIN_HUB}".
- Tüm araçlar "${MAIN_HUB}" noktasından yola çıkar.
- Yolcuları varış noktalarına (destination) bırakır.
- Görev bitince tekrar "${MAIN_HUB}" noktasına döner.

GÖREV:
Aşağıdaki talep listesini analiz et ve coğrafi olarak aynı güzergahta olanları grupla.
Örneğin: Keçiören ve Etlik aynı rotadadır (Kuzey). Batıkent ve Eryaman aynı rotadadır (Batı). Bunları birbirine karıştırma.

VERİ LİSTESİ:
${JSON.stringify(text)}

KURALLAR:
1. Çıktı SADECE STRICT JSON formatında olmalı.
2. Gruplama yaparken "Sektörel Dağılım" mantığını kullan. (Kuzey hattı, Batı hattı vb.)
3. JSON yapısı:
{
    "groups": [
        {
            "title": "Rota Başlığı (Örn: Kuzey Hattı - Keçiören/Bağlum)",
            "reason": "Neden gruplandı (Örn: Bu semtler merkezin kuzeyinde ve birbirine 5km mesafede.)",
            "ids": ["id1", "id2"]
        }
    ]
}
4. Her talep mutlaka bir gruba dahil edilmeli.
`;

    const parsed = await generateGeminiJson(prompt);
    if (!parsed) {
      return NextResponse.json({ msg: 'Gemini AI yanıt üretemedi veya API anahtarı geçersiz.' }, { status: 500 });
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error: any) {
    console.error('Parse Request API Error:', error);
    return NextResponse.json({ msg: 'Sunucu Hatası', error: error.message }, { status: 500 });
  }
}