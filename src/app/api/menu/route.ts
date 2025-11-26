import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import Menu from "@/src/lib/models/Menu";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { UserRole } from "@/src/lib/models/User";

export async function GET(request:NextRequest) {
    const {error} = getAuthenticatedUser(request);
    if(error) return error;    

    const {searchParams} = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth.toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    try {
        await connectToDatabase();

        const startDate = new Date(year,month, 1);
        const endDate = new Date(year,month+ 1,0);

        const menus = await Menu.find({
            date:{
                $gte: startDate,
                $lte : endDate
            }
        });
        return NextResponse.json(menus, {status : 200});
    }catch(err){
        return NextResponse.json({msg : 'Veri çekilemedi'}, {status : 500});
    }
}

export async function POST(request: NextRequest) {
    const{user, error} = getAuthenticatedUser(request);
    if(error) return error;
    
    if(user.role !== UserRole.ADMIN)
    {
        return NextResponse.json({msg : 'Yetkisiz işlem.'}, {status : 403});
    }
    try{
        const{date, items, calories} = await request.json();

        await connectToDatabase();

        const menuDate = new Date(date);

        const updatedMenu = await Menu.findOneAndUpdate(
            {date : menuDate},
            {items,calories},
            {new : true, upsert: true}
        );
        return NextResponse.json(updatedMenu , {status : 200});
    }catch(err){
        console.error(err);
        return NextResponse.json({msg : 'Kayıt hatası'}, {status : 500});
    }
}

