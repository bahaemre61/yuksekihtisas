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

        // 2. AI'ya Gönder (Prompt'u netleştirdik)
        const prompt = `
        Aşağıdaki ulaşım taleplerini mantıklı seferlere (gruplara) ayır ve JSON formatında döndür.
        Önemli: Çıktıda mutlaka "groups" anahtarı olsun.
        
        KURALLAR:
        - Saatleri birbirine yakın olanları aynı gruba koy.
        - "groups" dizisi içinde her obje "title", "reason" ve "ids" (string dizi) içermeli.
        
        Veriler: ${JSON.stringify(dataForAI)}`;

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
        // HATAYI TERMİNALDE GÖRMEK İÇİN:
        console.error("KRİTİK HATA (api/ai/driver-group):", err.message);
        return NextResponse.json({ 
            error: "Sunucu hatası", 
            details: err.message 
        }, { status: 500 });
    }
}