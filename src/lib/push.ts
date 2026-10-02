import webpush from 'web-push';
import User from '@/src/lib/models/User';

interface PushPayload {
    title: string;
    body: string;
    url?: string;
}

// Kullanıcının kayıtlı push aboneliğine anlık bildirim gönderir. Abonelik yoksa sessizce false döner.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    if (!pubKey || !privKey) {
        console.error('VAPID anahtarları tanımlı değil, push gönderilemedi.');
        return false;
    }

    const target = await User.findById(userId).select('name pushSubscription');
    const subscription = target?.pushSubscription;
    if (!subscription || !subscription.endpoint) return false;

    webpush.setVapidDetails('mailto:admin@universite.edu.tr', pubKey, privKey);

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return true;
    } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        console.error(`Push gönderim hatası (${target?.name}):`, (err as Error).message);
        if (status === 403 || status === 404 || status === 410) {
            await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: '' } });
        }
        return false;
    }
}
