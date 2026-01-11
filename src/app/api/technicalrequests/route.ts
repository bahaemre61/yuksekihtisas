import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import path from "path";
import { writeFile } from 'fs/promises';

export async function POST(request: NextRequest) {

    const {user,error} = getAuthenticatedUser(request);
    if(error) return error;

    try{

        await connectToDatabase();
        const formData = await request.formData();

    const file = formData.get('screenshot') as File | null;
    const description = formData.get('description') as string;
    const title = formData.get('title') as string;
    const city = formData.get('city') as string;
    const district = formData.get('district') as string;
    const userId = formData.get('userId') as string; // Frontend'den user ID gelmeli
    const priority = formData.get('priority') as string || 'MEDIUM';

    let screenshotUrl = '';

    if(file){
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = `${Date.now()}-${file.name.replaceAll(' ', '_')}`;

        const uploadDir = path.join(process.cwd(), 'public/uploads');
        const filePath = path.join(uploadDir, filename)

        await writeFile(filePath, buffer);

        screenshotUrl = `/uploads/${filename}`;
    }

    const newRequest = new TechnicalRequest({
        user: userId,
        title,
        description,
        district,
        priority,
        screenshotUrl: screenshotUrl || null,
    });

    await newRequest.save();

    return NextResponse.json({ msg: 'Teknik talep oluşturuldu'}, { status: 201 });
}catch(err){
    console.error('Teknik talep oluşturulurken hata oluştu:', err);
    return NextResponse.json({ error: 'Teknik talep oluşturulurken hata oluştu' }, { status: 500 });
}
}