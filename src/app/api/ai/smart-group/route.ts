import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { UserRole } from "@/src/lib/models/User";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error || user.role !== UserRole.ADMIN && user.role !== UserRole.AMIR) {
        return NextResponse.json({ msg: 'Yetkisiz erişim' }, { status: 403 });
    }

    try {
        await connectToDatabase();
        const pendingRequests = await VehicleRequest.find({ status: 'pending' })
            .populate('requestingUser', 'name')
            .lean();

        if (pendingRequests.length === 0) return NextResponse.json([]);

        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const dataForAI = pendingRequests.map((req: any) => ({
            id: req._id,
            destination: req.toLocation,
            priority: req.priority,
            date: new Date(req.startTime).toLocaleDateString('tr-TR'),
            time: new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }));

        const prompt = `
        Sen profesyonel bir rota planlama uzmanısın. Talepleri şu "Akıllı Gruplama" kurallarına göre birleştir:
        
        1. TARİH: Farklı günleri asla birleştirme.
        2. GÜZERGAH MANTIGI: Lokasyon isimleri birebir aynı olmasa bile (Örn: Balgat ve Bağlıca yerleşkeleri), eğer noktalar birbirine yakınsa veya aynı yöndeyse ve zamanları birbirini takip ediyorsa bunları TEK GRUPTA topla.
        3. ZAMAN: Aynı güzergahtaki taleplerin saatleri arasında 2 saatten fazla fark yoksa bunları bir sefer (grup) olarak kabul et.
        4. BAŞLIK: Gruba kapsayıcı bir isim ver. Örn: "19.02.2026 | Üniversite Yerleşkeleri Hattı | 13:15-14:00".

        Veri Listesi:
        ${JSON.stringify(dataForAI)}

        Yanıt Formatı (SADECE JSON):
        {
            "groups": [
                {
                    "title": "Kapsayıcı Grup Başlığı",
                    "reason": "Neden bu lokasyonları birleştirdin? (Örn: Bağlıca ve Balgat yakınlığı ve ardışık saatler)",
                    "ids": ["id1", "id2", "id3"]
                }
            ]
        }
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: 'Lojistik ve coğrafi rotalama uzmanısın.' }, { role: 'user', content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });

        const parsedData = JSON.parse(completion.choices[0].message.content || '{"groups":[]}');

        let enrichedGroups = parsedData.groups.map((group: any) => {
            let fullRequests = pendingRequests.filter((req: any) => group.ids.includes(req._id.toString()));

            // --- GRUP İÇİ SIRALAMA ---
            // KURAL: Acil (High) olan talep, saati daha geç olsa bile HER ZAMAN listede 1. sırada olur.
            fullRequests.sort((a: any, b: any) => {
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (a.priority !== 'high' && b.priority === 'high') return 1;
                // İkisi de aynı öncelikteyse saate göre sırala
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            });

            const groupDateParts = group.title.split(' | ')[0].split('.');
            const groupDate = new Date(Number(groupDateParts[2]), Number(groupDateParts[1]) - 1, Number(groupDateParts[0]));

            return {
                _id: group.title,
                description: group.reason,
                requests: fullRequests,
                totalRequests: fullRequests.length,
                highPriorityCount: fullRequests.filter((r: any) => r.priority === 'high').length,
                canAccept: groupDate <= todayDate,
                sortDate: groupDate.getTime(),
                // Grup kartının ekrandaki sırası için en üstteki talebin vaktini alıyoruz
                earliestTime: fullRequests.length > 0 ? new Date(fullRequests[0].startTime).getTime() : 0
            };
        });

        // 3. GRUPLAR ARASI SIRALAMA (Ekranda hangi kart önce çıkacak)
        enrichedGroups.sort((a: any, b: any) => {
            if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
            // İçinde acil iş olan kart her zaman daha önde/üstte
            if (b.highPriorityCount !== a.highPriorityCount) return b.highPriorityCount - a.highPriorityCount;
            return a.earliestTime - b.earliestTime;
        });

        return NextResponse.json(enrichedGroups);
    } catch (err) {
        return NextResponse.json({ error: "Sistem hatası" }, { status: 500 });
    }
}