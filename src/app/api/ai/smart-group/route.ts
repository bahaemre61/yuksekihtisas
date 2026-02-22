import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request as any);
        if (error) return error;

    if(user.role !== 'admin') {
        return NextResponse.json({ error: "Bu içeriğe erişim yetkiniz yok." }, { status: 403 });
    }

    try {
        await connectToDatabase();
        
        const allPending = await VehicleRequest.find({ status: 'pending' })
            .populate('requestingUser', 'name')
            .lean();

        if (!allPending || allPending.length === 0) {
            return NextResponse.json([]);
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. GÜVENLİ TARİH AYRIMI
        const todayRequests = allPending.filter((req: any) => {
            if (!req.startTime) return false;
            return new Date(req.startTime).toISOString().split('T')[0] === todayStr;
        });

        const futureRequests = allPending.filter((req: any) => {
            if (!req.startTime) return false;
            return new Date(req.startTime).toISOString().split('T')[0] > todayStr;
        });

        let finalGroups: any[] = [];

        if (todayRequests.length > 0) {
            const dataForAI = todayRequests.map((req: any) => ({
                id: req._id.toString(),
                destination: req.toLocation || "Belirtilmemiş",
                time: req.startTime ? new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : "00:00"
            }));

            const prompt = `
Sen profesyonel bir Lojistik Dispeçerisin. Ankara içindeki talepleri "Yığınlara" dönüştür.

KRİTİK LOJİSTİK KURALLAR:
1. BÖLGESEL GRUPLAMA:
   - Birbirine komşu veya aynı hat üzerindeki semtleri AYNI GRUBA almalısın.
   - ÖRNEK: "Sıhhiye", "Ulus", "Opera" ve "Dışkapı" birbirine çok yakındır. Bu konumlara giden talepleri mutlaka birleştir.
   - ÖRNEK: "Beşevler", "Bahçelievler" ve "Emek" yakındır, bunları birleştir.

2. GENİŞ ZAMAN PENCERESİ:
   - Aynı bölgeye giden talepler arasında en fazla 90-120 DAKİKA (1.5 - 2 saat) fark olabilir. 
   - Eğer bir araç o bölgeye gidiyorsa, yakın saatteki diğer talepleri de o gruba dahil etmelisin.

3. ACİLİYET VE ÖNCELİK:
   - Eğer bir talep "Acil" ise, o talebi grubun ana merkezi (çapası) yap ve diğer yakın talepleri onun etrafına topla.

4. KAPASİTE:
   - Bir araç (grup) en fazla 4-5 yolcu alabilir.

VERİLER: ${JSON.stringify(dataForAI)}

İSTEDİĞİM JSON ÇIKTISI:
{ 
  "groups": [ 
    { 
      "title": "Bölge Odaklı Başlık (Örn: Sıhhiye - Ulus Hattı)", 
      "ids": ["id1", "id2"], 
      "reason": "Neden bu talepleri birleştirdiğinin mantıklı açıklaması" 
    } 
  ] 
}`;

            try {
                const completion = await openai.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: "gpt-4o-mini",
                    temperature: 0,
                    response_format: { type: "json_object" },
                });

                const aiContent = completion.choices[0].message.content;
                if (!aiContent) throw new Error("AI boş cevap döndürdü");

                const aiResult = JSON.parse(aiContent);
                
                // AI'dan gelen grupları zenginleştir
                const todayGroups = (aiResult.groups || []).map((group: any) => ({
                    ...group,
                    isToday: true,
                    requests: todayRequests.filter((r: any) => group.ids.includes(r._id.toString())),
                    total: group.ids.length
                }));
                
                finalGroups = [...todayGroups];
            } catch (aiErr: any) {
                console.error("AI Gruplama Hatası:", aiErr.message);
                // AI hata verirse bugünküleri tekli grup yap ki sistem çökmesin
                const fallbackGroups = todayRequests.map((r: any) => ({
                    title: r.toLocation,
                    reason: "Otomatik Planlama (AI Yedek Mod)",
                    isToday: true,
                    ids: [(r as any)._id.toString()],
                    requests: [r],
                    total: 1
                }));
                finalGroups = [...fallbackGroups];
            }
        }

        // 3. GELECEK TALEPLERİ EKLE (Bunlar zaten AI'dan geçmiyor)
        const futureGroups = futureRequests.map((req: any) => ({
            title: `Planlı: ${req.toLocation || 'Konum Yok'}`,
            reason: "İleri tarihli görev.",
            isToday: false,
            ids: [req._id.toString()],
            requests: [req],
            total: 1
        }));

        return NextResponse.json([...finalGroups, ...futureGroups]);

    } catch (err: any) {
        console.error("KRİTİK API HATASI:", err.message);
        return NextResponse.json({ error: "Sunucu hatası", detail: err.message }, { status: 500 });
    }
}