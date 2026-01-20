import { NextResponse } from "next/server";
import City from "@/src/lib/Location";
import connectToDatabase from "@/src/lib/db";

export async function GET() {
    try{
        await connectToDatabase();
        const cityData = await City.findOne({name : 'Ankara'});
        if(!cityData)
        {
            return NextResponse.json({ msg: "Şehir bulunamadı."}, {status : 404})
        }

        const districtList = cityData.districts.map((d: any) => d.name).sort();

        return NextResponse.json({msg : "Başarılı", data : districtList}, {status : 200});


    } catch (error) {
        console.error("Apı Hatası:", error);
        return NextResponse.json({ error: "Şehirle ilgili bir hata oluştu." }, { status: 500 });
    }
}