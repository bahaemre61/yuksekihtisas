import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runScheduledDispatcherBot } from '@/src/lib/services/dispatcher-bot';
import { getAuthenticatedUser } from '@/src/lib/auth';

export async function GET(req: NextRequest) {
  return handleAutoAssign(req);
}

export async function POST(req: NextRequest) {
  return handleAutoAssign(req);
}

function hasValidCronSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  const provided = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

// Sunucu cron'u "Authorization: Bearer <CRON_SECRET>" ile çağırır.
// Yönetim sayfasındaki "Otonom Botu Çalıştır" düğmesi ise oturum çerezi ile (admin/supervisor) çağırır.
function isAuthorized(req: NextRequest): boolean {
  if (hasValidCronSecret(req)) return true;

  const { user } = getAuthenticatedUser(req);
  return !!user && (user.role === 'admin' || user.role === 'supervisor');
}

async function handleAutoAssign(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ success: false, error: 'Yetkisiz Erişim (Unauthorized Cron Call)' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSlot = searchParams.get('slot'); // 'morning' | 'afternoon' | 'all'
    const force = searchParams.get('force') === 'true';

    let targetSlot: 'morning' | 'afternoon' | 'all' = 'all';

    if (requestedSlot === 'morning' || requestedSlot === 'afternoon') {
      targetSlot = requestedSlot;
    } else if (!force) {
      // Türkiye saatine (Europe/Istanbul) göre vardiya tespiti; sunucu saat dilimi (UTC vb.) fark etmez
      const currentHour = Number(
        new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: 'numeric', hourCycle: 'h23' }).format(new Date())
      );
      targetSlot = currentHour < 13 ? 'morning' : 'afternoon';
    }

    const result = await runScheduledDispatcherBot(targetSlot);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (err: any) {
    console.error('Cron Auto-Assign Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
