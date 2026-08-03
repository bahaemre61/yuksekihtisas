import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const templatesDir = path.join(publicDir, 'templates');

    // Dizin yoksa oluştur
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // public/templates ve public kök klasöründeki .doc / .docx dosyalarını tara
    const templateFiles: string[] = [];

    if (fs.existsSync(templatesDir)) {
      const filesInDir = fs.readdirSync(templatesDir);
      filesInDir.forEach(f => {
        const ext = path.extname(f).toLowerCase();
        if (ext === '.docx' || ext === '.doc') {
          templateFiles.push(`templates/${f}`);
        }
      });
    }

    // Eğer templates klasöründe yoksa public/ kök dizinini de kontrol et
    if (templateFiles.length === 0) {
      const filesInPublic = fs.readdirSync(publicDir);
      filesInPublic.forEach(f => {
        const ext = path.extname(f).toLowerCase();
        if (ext === '.docx' || ext === '.doc') {
          templateFiles.push(f);
        }
      });
    }

    const templates = templateFiles.map((relativePath) => {
      const filename = path.basename(relativePath);
      const ext = path.extname(filename);
      const cleanName = filename
        .slice(0, -ext.length)
        .replace(/[-_]/g, ' ')
        .trim();

      return {
        id: encodeURIComponent(filename),
        title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        filename: filename,
        downloadUrl: `/api/evidence/templates/${encodeURIComponent(filename)}`
      };
    });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing Word templates:', error);
    return NextResponse.json({ templates: [] }, { status: 500 });
  }
}
