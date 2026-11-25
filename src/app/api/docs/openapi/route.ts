import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { UserRole } from '@/src/lib/models/User';

// OpenAPI dosyası yalnızca admin'e verilir (endpoint haritasını herkese açmamak için).
export async function GET(request: NextRequest) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ msg: 'Yasak: Yetkisiz giriş.' }, { status: 403 });
  }

  try {
    const yaml = await readFile(path.join(process.cwd(), 'docs', 'openapi.yaml'), 'utf8');
    return new NextResponse(yaml, {
      headers: {
        'Content-Type': 'application/yaml; charset=utf-8',
        'Content-Disposition': 'inline; filename="openapi.yaml"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ msg: 'openapi.yaml bulunamadı.' }, { status: 404 });
  }
}
