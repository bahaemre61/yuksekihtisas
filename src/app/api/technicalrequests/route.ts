import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import path from "path";
import { writeFile } from 'fs/promises';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

export async function POST(request: NextRequest) {

    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();
        const formData = await request.formData();

        const file = formData.get('screenshot') as File | null;
        const description = formData.get('description') as string;
        const title = formData.get('title') as string;
        const location = formData.get('location') as string;
        const priority = formData.get('priority') as string || 'MEDIUM';

        let screenshotUrl = '';

        if (file) {
            
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: 'Dosya boyutu 5MB\'dan büyük olamaz.' }, { status: 400 });
            }

            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                return NextResponse.json({ error: 'Sadece resim dosyaları (JPG, PNG, WEBP) yüklenebilir.' }, { status: 400 });
            }

            const ext = path.extname(file.name).toLowerCase();
            if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                return NextResponse.json({ error: 'Geçersiz dosya uzantısı.' }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const safeFilename = `${Date.now()}-${path.basename(file.name).replaceAll(/[^a-zA-Z0-9._-]/g, '')}`;

            const uploadDir = path.join(process.cwd(), 'public/uploads');
            const filePath = path.join(uploadDir, safeFilename);

            await writeFile(filePath, buffer);

            screenshotUrl = `/uploads/${safeFilename}`;
        }

        const newRequest = new TechnicalRequest({
            user: user.id,
            title,
            description,
            location,
            priority,
            screenshotUrl: screenshotUrl || null,
        });

        await newRequest.save();

        return NextResponse.json({ msg: 'Teknik talep oluşturuldu' }, { status: 201 });
    } catch (err) {
        console.error('Teknik talep oluşturulurken hata oluştu:', err);
        return NextResponse.json({ error: 'Teknik talep oluşturulurken hata oluştu' }, { status: 500 });
    }
}