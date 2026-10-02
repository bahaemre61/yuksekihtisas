import axios from 'axios';

export type PushState = 'unsupported' | 'denied' | 'inactive' | 'active';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// Bu tarayıcıda anlık bildirim durumu
export async function getPushState(): Promise<PushState> {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    return sub ? 'active' : 'inactive';
  }
  return 'inactive';
}

// Kullanıcı etkileşimiyle çağrılmalı: izin ister, aboneliği oluşturur ve sunucuya kaydeder.
export async function enablePush(): Promise<PushState> {
  if (!isSupported()) return 'unsupported';

  const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!publicKey) throw new Error('VAPID anahtarı tanımlı değil.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'inactive';

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    }));

  await axios.post('/api/technicalrequests/push/subscribe', subscription);
  return 'active';
}
