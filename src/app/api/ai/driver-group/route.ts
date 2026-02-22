import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
    try {
        const { user, error } = getAuthenticatedUser(request as any);
        if (error) return error;

        if(user.role !== 'driver'){
            return NextResponse.json({ error: "Bu içeriğe erişim yetkiniz yok." }, { status: 403 });
        }

        await connectToDatabase();
        
        const myTasks = await VehicleRequest.find({ 
            assignedDriver: user.id, 
            status: 'assigned' 
        }).populate('requestingUser', 'name').lean();

        if (myTasks.length === 0) return NextResponse.json([]);

        const dataForAI = myTasks.map((req: any) => ({
            id: req._id.toString(),
            destination: req.toLocation,
            priority: req.priority,
            time: new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }));

        const prompt = `
Sen profesyonel bir üniversite lojistik planlayıcısısın. Görevin, gelen ulaşım taleplerini en verimli SEFERLERE (gruplara) ayırmaktır.

KRİTİK KURALLAR:
1. KONUM ODAKLI GRUPLAMA: Bir seferdeki tüm yolcuların hedefi (destination) AYNI veya birbirine çok yakın olmalıdır. Farklı yerlere gidenleri aynı gruba koyma.
2. ZAMAN PENCERESİ: Aynı gruptaki taleplerin "time" değerleri arasında en fazla 90 DAKİKA fark olabilir.
3. KAPASİTE SINIRI: Bir sefer (grup) en fazla 4 yolcu içerebilir. 5. kişi için yeni bir grup açmalısın.
4. ÖNCELİK: Eğer bir talep "high" (yüksek) öncelikli ise, onu bekletmeden ilk uygun seferine dahil et.
5. JSON FORMATI: Sadece aşağıda belirtilen JSON yapısında yanıt ver, başka açıklama ekleme.

VERİLER: ${JSON.stringify(dataForAI)}

İSTEDİĞİM ÇIKTI FORMATI:
{
  "groups": [
    {
      "title": "Kısa ve net sefer başlığı (Örn: Tıp Fakültesi Seferi)",
      "reason": "Neden bu talepleri birleştirdiğinin kısa açıklaması",
      "ids": ["id1", "id2"]
    }
  ]
}`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: 'Sen bir lojistik uzmanısın ve sadece JSON formatında yanıt verirsin.' }, 
                { role: 'user', content: prompt }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        const rawContent = completion.choices[0].message.content;

        const parsedData = JSON.parse(rawContent || '{"groups":[]}');
        const aiGroups = parsedData.groups || [];

        const enrichedGroups = aiGroups.map((group: any) => {
            const matchedRequests = myTasks.filter((req: any) => 
                group.ids.includes(req._id.toString())
            );
            
            return {
                title: group.title || "Adsız Sefer",
                description: group.reason || "",
                requests: matchedRequests,
                total: matchedRequests.length
            };
        });

        const matchedIds = aiGroups.flatMap((g: any) => g.ids);
        const leftoverRequests = myTasks.filter((req: any) => !matchedIds.includes(req._id.toString()));

        if (leftoverRequests.length > 0) {
            enrichedGroups.push({
                title: "Diğer Görevler",
                description: "AI tarafından gruplandırılamayan talepler.",
                requests: leftoverRequests,
                total: leftoverRequests.length
            });
        }

        return NextResponse.json(enrichedGroups);

    } catch (err: any) {
        console.error("KRİTİK HATA (api/ai/driver-group):", err.message);
        return NextResponse.json({ 
            error: "Sunucu hatası", 
            details: err.message 
        }, { status: 500 });
    }
}