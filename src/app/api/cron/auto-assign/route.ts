import { NextRequest, NextResponse } from 'next/server';
import { runScheduledDispatcherBot } from '@/src/lib/services/dispatcher-bot';

export async function GET(req: NextRequest) {
  return handleAutoAssign(req);
}

export async function POST(req: NextRequest) {
  return handleAutoAssign(req);
}

async function handleAutoAssign(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorizatoin');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ success: false, error: 'Yetkisiz Erişim (Unauthorized Cron Call)' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url);
    const requestedSlot = searchParams.get('slot'); // 'morning' | 'afternoon' | 'all'
    const force = searchParams.get('force') === 'true';

    let targetSlot: 'morning' | 'afternoon' | 'all' = 'all';

    if (requestedSlot === 'morning' || requestedSlot === 'afternoon') {
      targetSlot = requestedSlot;
    } else if (!force) {
      // Türkiye Saatine (Europe/Istanbul) göre otomatik tespit
      const istanbulTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
      const istanbulDate = new Date(istanbulTimeStr);
      const currentHour = istanbulDate.getHours();

      if (currentHour < 13) {
        targetSlot = 'morning';
      } else {
        targetSlot = 'afternoon';
      }
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
