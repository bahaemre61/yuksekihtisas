import { NextResponse } from "next/server";
import OpenAI from 'openai';

const MAIN_HUB = "Yüksek İhtisas Üniversitesi - 100. Yıl Yerleşkesi (Tıp Fakültesi)";

const openai = new OpenAI({
    apiKey : process.env.OPENAI_API_KEY,
});

export async function POST(request:Request) {
    console.log("AI KEY STATUS:", process.env.OPENAI_API_KEY ? "OK" : "HATA! Anahtar Bulunamadı.");
    try{
        const {text} = await request.json();

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
    1. Çıktı SADECE JSON formatında olmalı.
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
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o-mini", 
      response_format: { type: "json_object" }, 
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json(result, {status : 200});
}catch (error){
    return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
}
}