import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { UserRole } from "@/src/lib/models/User";


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request : NextRequest) {

    const {user,error} = getAuthenticatedUser(request);
if(error) return error

     if(user.role !== UserRole.DRIVER)
         {
             return NextResponse.json({msg : 'Sadece şoförler iş tamamlayabilir.'}, {status :403});
        }
    try{
        await connectToDatabase();

        const pendingRequests = await VehicleRequest.find({status : 'pending'})
        .populate('requestingUser','name')
        .select('fromLocation toLocation requestingUser priority purpose startTime')
        .lean();

        if(pendingRequests.length === 0){
            return NextResponse.json([], {status : 200});
        }

        const dataForAI =  pendingRequests.map((req:any) => ({
            id: req._id,
            destination : req.toLocation,
            priority: req.priority,
        }));

        const prompt= `
        Sen bir lojistik uzmanısın. Aşağıdaki varış noktalarına (destination) analiz et ve birbirine yakın olanları veya aynı güzergahta olanları grupla.
        
        Veri Listesi:
        ${JSON.stringify(dataForAI)}

        Kurallar:
        1.Çıktı  SADECE JSON formatında olmalı.
        2.JSON yapısı şu şekilde olmalı:
        {
                "groups":[
                {
                "title" : "Grup Başlığı (Örn: Çankaya- Kızılay Rotası)",
                "reason": "Neden gruplandı (Örn: Bu lokasyonlar şehir mekerzinde birbirine yakındır.)",
                "ids" : ["id1","id2"]
                }
            ]
        }
        3. Her talep mutlaka bir gruba dahil edilmeli.
        4.Eğer bir lokasyon ve alakasızsa ve tek kalıyorsa, tek kişilik bir grup yap.
        `;

        const completion = await openai.chat.completions.create({
            messages: [
                {role : 'system', content : 'Sen JSON formatında yanıt veren lojistik uzmanısın.'},
                {role : 'user', content : prompt}
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object"},
        });

        const aiContent = completion.choices[0].message.content;

        if(!aiContent) throw new Error("AI yanıt vermedi.");

        const parsedData = JSON.parse(aiContent);

        const enrichedGroups = parsedData.groups.map((group : any) => {
            const fullRequests = pendingRequests.filter((req : any)=>
                group.ids.includes(req._id.toString())
            );
            const highPrioirtyCount = fullRequests.filter((req : any) => req.priority === 'high').length;

            return {
                _id: group.title,
                description : group.reason,
                highPrioirtyCount: highPrioirtyCount,
                requests : fullRequests
            };
        });

        return NextResponse.json(enrichedGroups, {status : 200});
        
    }catch(error)
    {
        console.error("AI Grouping Error :", error);
        return NextResponse.json({error : "Yapay zeka gruplama yapamadı."},{status : 500});
    }
}