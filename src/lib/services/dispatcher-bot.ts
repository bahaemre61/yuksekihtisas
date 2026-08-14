import connectToDatabase from '@/src/lib/db';
import VehicleRequest, { RequestStatus } from '@/src/lib/models/VehicleRequest';
import User from '@/src/lib/models/User';
import { sendMail } from '@/src/lib/mail';
import webpush from 'web-push';

export interface IBotLogResult {
  timestamp: string;
  action: 'SCHEDULED_MORNING' | 'SCHEDULED_AFTERNOON' | 'URGENT_INSTANT' | 'REACTIVE_CHECK';
  assignedGroupsCount: number;
  assignedRequestsCount: number;
  details: string[];
}

// Regional clustering fallback helper for Ankara districts / locations
function getRegionGroupKey(locationStr?: string): string {
  if (!locationStr) return 'MERKEZ';
  const loc = locationStr.toUpperCase();

  if (loc.includes('BALGAT') || loc.includes('100.YIL') || loc.includes('100YIL') || loc.includes('ÇANKAYA') || loc.includes('CANKAYA')) {
    return 'BÖLGE-1 (Balgat - 100.Yıl - Çankaya Hattı)';
  }
  if (loc.includes('SIHHIYE') || loc.includes('ULUS') || loc.includes('KIZILAY') || loc.includes('OPERA') || loc.includes('DISKAPI')) {
    return 'BÖLGE-2 (Sıhhiye - Ulus - Kızılay - Opera Hattı)';
  }
  if (loc.includes('BAĞLUM') || loc.includes('BAGLUM') || loc.includes('KEÇİÖREN') || loc.includes('KECIOREN') || loc.includes('SANATORYUM')) {
    return 'BÖLGE-3 (Bağlum - Keçiören - Sanatoryum Hattı)';
  }
  if (loc.includes('YENİMAHALLE') || loc.includes('YENIMAHALLE') || loc.includes('BATIKENT') || loc.includes('OSTİM') || loc.includes('ERYAMAN')) {
    return 'BÖLGE-4 (Yenimahalle - Ostim - Batıkent - Eryaman Hattı)';
  }
  return `BÖLGE-GENEL (${loc.slice(0, 15)})`;
}

// Push notification initializer helper
function setupWebPush() {
  const pubKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;

  if (pubKey && privKey) {
    try {
      webpush.setVapidDetails('mailto:bilgiislem@yuksekihtisas.edu.tr', pubKey, privKey);
    } catch (e) {
      console.warn('VAPID setup warning:', e);
    }
  }
}

import { generateGeminiJson } from '@/src/lib/gemini';

/**
 * Google Gemini API Lojistik Dispeçer Gruplama Servisi
 */
async function getAIGrouping(todayPending: any[]): Promise<{ title: string; reason: string; ids: string[] }[] | null> {
  try {
    const dataForAI = todayPending.map((req: any) => ({
      id: req._id.toString(),
      passenger: req.requestingUser?.name || 'Kullanıcı',
      from: req.fromLocation || 'Rektörlük',
      to: req.toLocation || 'Belirtilmemiş',
      time: req.startTime ? new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '00:00',
      priority: req.priority || 'normal'
    }));

    const prompt = `
Sen profesyonel bir Ankara Şehir İçi Lojistik Dispeçerisin. Aşağıdaki araç taleplerini en mantıklı "Yığın / Rota Gruplarına" dönüştürmelisin.

KRİTİK LOJİSTİK VE ANKARA COĞRAFİ KONUM KURALLARI:
1. ANKARA BÖLGESEL VE HAT YAKINLIĞI:
   - Birbirine komşu veya aynı güzergah üzerindeki semt ve kampusleri AYNI GRUBA al.
   - ÖRNEK 1: "Sıhhiye", "Ulus", "Opera", "Dışkapı", "Kızılay" yakındır, aynı hatta birleştir.
   - ÖRNEK 2: "Balgat", "100.Yıl", "Tıp Fakültesi", "Çankaya", "Beşevler", "Bahçelievler" yakındır, birleştir.
   - ÖRNEK 3: "Bağlum", "Keçiören", "Etlik", "Sanatoryum" aynı kuzey hattındadır, birleştir.
   - ÖRNEK 4: "Yenimahalle", "Ostim", "Batıkent", "Eryaman" aynı batı hattındadır, birleştir.

2. ZAMAN PENCERESİ VE ESNEKLİK:
   - Aynı bölgeye giden talepler arasında en fazla 90-120 DAKİKA (1.5 - 2 saat) zaman farkı olabilir. Yakın saatteki talepleri o bölge aracına ekle.

3. ACİLİYET VE ÖNCELİK:
   - "Acil" (high) öncelikli talebi grubun ana merkezi (çapası) yap.

4. ARAÇ KAPASİTESİ:
   - Bir araç (grup) en fazla 4-5 yolcu/talep alabilir.

VERİLER: ${JSON.stringify(dataForAI)}

İSTEDİĞİM STRICT JSON ÇIKTISI:
{ 
  "groups": [ 
    { 
      "title": "Bölge Odaklı Başlık (Örn: Sıhhiye - Ulus - Dışkapı Hattı)", 
      "ids": ["id1", "id2"], 
      "reason": "Bu taleplerin neden birleştirildiğinin coğrafi ve lojistik açıklaması" 
    } 
  ] 
}
`;

    const result = await generateGeminiJson<{ groups: { title: string; reason: string; ids: string[] }[] }>(prompt);
    return result?.groups || null;
  } catch (err: any) {
    console.warn('Gemini Dispatcher Bot grouping failed, using fallback:', err.message);
    return null;
  }
}

/**
 * 🚨 ACİL TALEP OTOMATİK ATAMA (INSTANT EVENT-DRIVEN BOT)
 * Acil talep oluşturulduğu anda tetiklenir, en uygun şoföre anında atar.
 */
export async function runUrgentDispatcherBot(requestId: string): Promise<IBotLogResult> {
  const logDetails: string[] = [];
  const timestamp = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  try {
    await connectToDatabase();
    setupWebPush();

    const reqDoc = await VehicleRequest.findById(requestId).populate('requestingUser', 'name email');
    if (!reqDoc || reqDoc.status !== RequestStatus.PENDING) {
      return {
        timestamp,
        action: 'URGENT_INSTANT',
        assignedGroupsCount: 0,
        assignedRequestsCount: 0,
        details: ['Talep bulunamadı veya zaten atanmış.']
      };
    }

    // 1. Müsait şoförleri bul ve iş yüküne göre sırala
    const availableDrivers = await User.find({
      role: 'driver',
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).lean();

    if (availableDrivers.length === 0) {
      logDetails.push('🚨 ACİL TALEP UYARISI: Sistemde müsait aktif şoför bulunamadı.');
      return {
        timestamp,
        action: 'URGENT_INSTANT',
        assignedGroupsCount: 0,
        assignedRequestsCount: 0,
        details: logDetails
      };
    }

    // Her şoförün üzerindeki atanan aktif görev sayısını hesapla
    const driverWorkloads = await Promise.all(
      availableDrivers.map(async (d: any) => {
        const activeCount = await VehicleRequest.countDocuments({
          assignedDriver: d._id,
          status: RequestStatus.ASSIGNED
        });
        return { driver: d, activeCount };
      })
    );

    // En az iş yükü olan şoförü seç
    driverWorkloads.sort((a, b) => a.activeCount - b.activeCount);
    const chosenDriver = driverWorkloads[0].driver;

    // 2. Talebi Şoföre Ata
    reqDoc.assignedDriver = chosenDriver._id;
    reqDoc.status = RequestStatus.ASSIGNED;
    await reqDoc.save();

    logDetails.push(`🚨 ACİL TALEP ATANDI: "${reqDoc.toLocation}" hedefli acil talep otonom olarak ${chosenDriver.name} şoförüne bağlandı.`);

    // 3. Şoföre Web Push & E-posta Bildirimi
    if (chosenDriver.pushSubscription) {
      try {
        const payload = JSON.stringify({
          title: '🚨 ACİL GÖREV ATANDI!',
          body: `Öncelikli Acil Sürüş Görevi: ${reqDoc.fromLocation} ➔ ${reqDoc.toLocation}`,
          url: '/dashboard/gorevlerim'
        });
        await webpush.sendNotification(chosenDriver.pushSubscription, payload);
        logDetails.push(`📱 Push bildirimi gönderildi: ${chosenDriver.name}`);
      } catch (e) {
        console.warn('Push notification error:', e);
      }
    }

    if (chosenDriver.email) {
      const driverSubject = '🚨 ACİL SÜRÜŞ GÖREVİ ATANDI - YIU Portal';
      const driverHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 12px; background-color: #fef2f2;">
          <h2 style="color: #dc2626; margin-top: 0;">🚨 ACİL SÜRÜŞ GÖREVİ!</h2>
          <p>Sayın <strong>${chosenDriver.name}</strong>, sistemimiz otonom olarak size <strong>ACİL</strong> öncelikli bir sürüş görevi tanımladı.</p>
          <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #fee2e2; margin: 15px 0;">
            <p><strong>Talep Eden:</strong> ${(reqDoc.requestingUser as any)?.name || 'Kullanıcı'}</p>
            <p><strong>Güzergah:</strong> ${reqDoc.fromLocation} ➔ ${reqDoc.toLocation}</p>
            <p><strong>Tarih / Saat:</strong> ${new Date(reqDoc.startTime).toLocaleString('tr-TR')}</p>
            <p style="color: #dc2626; font-weight: bold;">Öncelik: ACİL (Gecikmesiz İşlem)</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/gorevlerim" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
             GÖREVE GİT VE BAŞLAT
          </a>
        </div>
      `;
      sendMail(chosenDriver.email, driverSubject, driverHtml);
    }

    // Yolcuya Bilgilendirme E-postası
    if ((reqDoc.requestingUser as any)?.email) {
      const passengerSubject = '🚗 Acil Araç Talebiniz Şoföre Atandı';
      const passengerHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #3b82f6; border-radius: 12px;">
          <h2 style="color: #2563eb;">Merhaba ${(reqDoc.requestingUser as any)?.name},</h2>
          <p>Acil araç talebiniz otonom sistem tarafından işleme alındı ve şoför atanması tamamlandı.</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Atanan Şoför:</strong> ${chosenDriver.name}</p>
            <p><strong>Güzergah:</strong> ${reqDoc.fromLocation} ➔ ${reqDoc.toLocation}</p>
            <p><strong>Saat:</strong> ${new Date(reqDoc.startTime).toLocaleString('tr-TR')}</p>
          </div>
        </div>
      `;
      sendMail((reqDoc.requestingUser as any)?.email, passengerSubject, passengerHtml);
    }

    return {
      timestamp,
      action: 'URGENT_INSTANT',
      assignedGroupsCount: 1,
      assignedRequestsCount: 1,
      details: logDetails
    };
  } catch (err: any) {
    console.error('runUrgentDispatcherBot error:', err);
    return {
      timestamp,
      action: 'URGENT_INSTANT',
      assignedGroupsCount: 0,
      assignedRequestsCount: 0,
      details: [`Hata: ${err.message}`]
    };
  }
}

/**
 * ⏰ ZAMANLANMIŞ VARDİYA BOTU (SCHEDULED DISPATCHER BOT WITH OPENAI GPT)
 * Saat 08:30 (Sabah) veya 13:30 (Öğle) vardiyaları için tüm havuzu otomatik dağıtır.
 */
export async function runScheduledDispatcherBot(
  timeSlot: 'morning' | 'afternoon' | 'all'
): Promise<IBotLogResult> {
  const logDetails: string[] = [];
  const timestamp = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const actionType = timeSlot === 'morning' ? 'SCHEDULED_MORNING' : timeSlot === 'afternoon' ? 'SCHEDULED_AFTERNOON' : 'REACTIVE_CHECK';

  try {
    await connectToDatabase();
    setupWebPush();

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

    // 1. Bekleyen talepleri getir
    const pendingRequests = await VehicleRequest.find({ status: RequestStatus.PENDING })
      .populate('requestingUser', 'name email')
      .lean();

    if (!pendingRequests || pendingRequests.length === 0) {
      logDetails.push('🤖 Dispeçer Botu: İşlem bekleyen araç talebi bulunmuyor.');
      return {
        timestamp,
        action: actionType,
        assignedGroupsCount: 0,
        assignedRequestsCount: 0,
        details: logDetails
      };
    }

    // Bugünkü talepleri saat dilimine göre filtrele
    const todayPending = pendingRequests.filter((req: any) => {
      if (!req.startTime) return false;
      const reqDateStr = new Date(req.startTime).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
      if (reqDateStr !== todayStr) return false;

      const hourStr = new Date(req.startTime).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false });
      const hours = parseInt(hourStr, 10);

      if (timeSlot === 'morning') {
        // Sabah Vardiyası: 08:30 - 12:00
        return hours < 13;
      } else if (timeSlot === 'afternoon') {
        // Öğle Vardiyası: 13:00 - 17:30
        return hours >= 13;
      }
      return true;
    });

    if (todayPending.length === 0) {
      logDetails.push(`🤖 Dispeçer Botu: ${timeSlot === 'morning' ? 'Sabah (08:30)' : 'Öğle (13:30)'} vardiyası için bekleyen talep yok.`);
      return {
        timestamp,
        action: actionType,
        assignedGroupsCount: 0,
        assignedRequestsCount: 0,
        details: logDetails
      };
    }

    // 2. Aktif müsait şoförleri bul ve iş yüklerine göre sırala
    const availableDrivers = await User.find({
      role: 'driver',
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).lean();

    if (availableDrivers.length === 0) {
      logDetails.push('⚠️ UYARI: Sistemde atama yapılabilecek aktif şoför bulunamadı!');
      return {
        timestamp,
        action: actionType,
        assignedGroupsCount: 0,
        assignedRequestsCount: 0,
        details: logDetails
      };
    }

    // Şoför iş yüklerini hesapla
    const driverWorkloads = await Promise.all(
      availableDrivers.map(async (d: any) => {
        const activeCount = await VehicleRequest.countDocuments({
          assignedDriver: d._id,
          status: RequestStatus.ASSIGNED
        });
        return { driver: d, activeCount };
      })
    );

    // İş yüküne göre sırala (En boş olan ilk sırada)
    driverWorkloads.sort((a, b) => a.activeCount - b.activeCount);

    // 3. Talepleri Bölgelere / Güzergahlara Göre Akıllı Grupla (Önce OpenAI GPT, Yoksa Fallback Algoritması)
    let finalGroups: { title: string; reason: string; reqs: any[] }[] = [];

    const aiGroups = await getAIGrouping(todayPending);

    if (aiGroups && aiGroups.length > 0) {
      logDetails.push('🧠 Yapay Zeka Lojistik Dispeçeri (Google Gemini API): Coğrafi yakınlık ve zaman pencerelerine göre akıllı gruplama üretti.');

      finalGroups = aiGroups.map(g => {
        const groupReqs = todayPending.filter((r: any) => g.ids.includes((r._id as any).toString()));
        return {
          title: g.title,
          reason: g.reason,
          reqs: groupReqs
        };
      }).filter(g => g.reqs.length > 0);

      // AI tarafından kapsanmayan (varsa) diğer talepleri grupla
      const handledIds = new Set(finalGroups.flatMap(g => g.reqs.map((r: any) => (r._id as any).toString())));
      const unassignedByAI = todayPending.filter((r: any) => !handledIds.has((r._id as any).toString()));

      if (unassignedByAI.length > 0) {
        unassignedByAI.forEach(req => {
          const regionName = getRegionGroupKey(req.toLocation || req.fromLocation);
          finalGroups.push({
            title: regionName,
            reason: 'Bölgesel Yakınlık Algoritması (Yedek)',
            reqs: [req]
          });
        });
      }
    } else {
      logDetails.push('📌 Bölgesel Yakınlık Algoritması (Kural Bazlı): Ankara semt ve hat komşuluklarına göre gruplama yapıldı.');
      const regionMap: Record<string, any[]> = {};
      todayPending.forEach((req: any) => {
        const groupKey = getRegionGroupKey(req.toLocation || req.fromLocation);
        if (!regionMap[groupKey]) regionMap[groupKey] = [];
        regionMap[groupKey].push(req);
      });

      finalGroups = Object.entries(regionMap).map(([regionName, reqs]) => ({
        title: regionName,
        reason: 'Aynı güzergah ve bölge komşuluğu',
        reqs
      }));
    }

    let assignedGroupsCount = 0;
    let totalAssignedRequests = 0;

    // 4. Her Grubu En Uygun Müsait Şoföre Ata (Round-Robin & Workload Balancing)
    let driverIndex = 0;

    for (const groupObj of finalGroups) {
      const { title: regionName, reason: groupReason, reqs } = groupObj;
      const reqIds = reqs.map(r => r._id);
      const chosenDriver = driverWorkloads[driverIndex % driverWorkloads.length].driver;

      // Veritabanında atamayı güncelle
      const updateResult = await VehicleRequest.updateMany(
        { _id: { $in: reqIds }, status: RequestStatus.PENDING },
        { $set: { assignedDriver: chosenDriver._id, status: RequestStatus.ASSIGNED } }
      );

      if (updateResult.modifiedCount > 0) {
        assignedGroupsCount++;
        totalAssignedRequests += updateResult.modifiedCount;

        // Şoför iş yükü sayacını güncelle
        driverWorkloads[driverIndex % driverWorkloads.length].activeCount += updateResult.modifiedCount;

        logDetails.push(
          `✅ OTOMATİK ATAMA: "${regionName}" (${groupReason}) grubundaki ${updateResult.modifiedCount} talep ${chosenDriver.name} üzerine atandı.`
        );

        // Şoföre Web Push & E-posta Gönder
        if (chosenDriver.pushSubscription) {
          try {
            const payload = JSON.stringify({
              title: `🤖 OTOMATİK VARDİYA ATAMASI (${timeSlot === 'morning' ? '08:30' : '13:30'})`,
              body: `${regionName} için ${updateResult.modifiedCount} adet talep listenize otomatik eklendi.`,
              url: '/dashboard/gorevlerim'
            });
            await webpush.sendNotification(chosenDriver.pushSubscription, payload);
          } catch (e) {
            console.warn('Push error:', e);
          }
        }

        if (chosenDriver.email) {
          const driverSubject = `🤖 Otomatik Vardiya Görevleri Atandı (${chosenDriver.name})`;
          const driverHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px; background-color: #ecfdf5;">
              <h2 style="color: #059669;">Merhaba ${chosenDriver.name},</h2>
              <p>Otonom Dispeçer Botu saat <strong>${timeSlot === 'morning' ? '08:30' : '13:30'}</strong> vardiyası için yeni görevleri listenize otomatik ekledi.</p>
              <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #a7f3d0; margin: 15px 0;">
                <p><strong>Grup / Güzergah:</strong> ${regionName}</p>
                <p><strong>Gruplama Mantığı:</strong> ${groupReason}</p>
                <p><strong>Atanan Yolcu / Talep Sayısı:</strong> ${updateResult.modifiedCount} Adet</p>
              </div>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/gorevlerim" 
                 style="display: inline-block; background: #059669; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                 GÖREVLERİME GİT
              </a>
            </div>
          `;
          sendMail(chosenDriver.email, driverSubject, driverHtml);
        }

        // Yolcuları bilgilendir
        for (const req of reqs) {
          if (req.requestingUser?.email) {
            const passengerSubject = '🚗 Araç Talebiniz Otomatik Atandı';
            const passengerHtml = `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h3 style="color: #2563eb;">Merhaba ${req.requestingUser.name},</h3>
                <p>Araç talebiniz otonom dispeçer sistemi tarafından başarıyla şoföre atandı.</p>
                <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px;">
                  <p><strong>Şoför:</strong> ${chosenDriver.name}</p>
                  <p><strong>Güzergah:</strong> ${req.fromLocation} ➔ ${req.toLocation}</p>
                </div>
              </div>
            `;
            sendMail(req.requestingUser.email, passengerSubject, passengerHtml);
          }
        }
      }

      driverIndex++;
    }

    return {
      timestamp,
      action: actionType,
      assignedGroupsCount,
      assignedRequestsCount: totalAssignedRequests,
      details: logDetails
    };
  } catch (err: any) {
    console.error('runScheduledDispatcherBot error:', err);
    return {
      timestamp,
      action: actionType,
      assignedGroupsCount: 0,
      assignedRequestsCount: 0,
      details: [`Hata: ${err.message}`]
    };
  }
}
