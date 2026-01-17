import { NextResponse } from "next/server";
import Location from "@/src/lib/Location";
import  connectToDatabase  from "@/src/lib/db";


export async function GET() {
    try{
        await connectToDatabase();

        const locations = await Location.find({}).sort({name : 1});

        const locationList = locations.map(loc => loc.name);

        return NextResponse.json({success : true, data: locationList}, {status : 200});
    }catch(error:any){
        return NextResponse.json({success : false, error: error.message}, {status : 500}); 
    }
}