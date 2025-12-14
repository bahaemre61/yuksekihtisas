import { NextResponse } from "next/server";
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey : process.env.OPENAI_API_KEY,
});

export async function POST(request:Request) {
    console.log("AI KEY STATUS:", process.env.OPENAI_API_KEY ? "OK" : "HATA! Anahtar Bulunamadı.");
    try{
        const {text} = await request.json();

        const prompt = `
      Sen bir araç talep asistanısın. Kullanıcının yazdığı metni analiz edip aşağıdaki JSON formatına çevireceksin.
      Bugünün tarihi: ${new Date().toISOString()}
      
      Çıktı Formatı (JSON):
      {
        "fromLocation": "string (Varsayılan: Merkez)",
        "toLocation": "string",
        "purpose": "string",
        "startTime": "ISO String (Tahmin et)",
        "endTime": "ISO String (Gidişten 1 saat sonra varsay)",
        "willCarryItems": boolean,
        "priority": "normal" veya "high" (Acil kelimesi geçerse high)
      }

      Kullanıcı Metni: "${text}"
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