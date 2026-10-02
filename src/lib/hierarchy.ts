import User from '@/src/lib/models/User';

// Bir kullanıcının altındaki tüm kişileri (doğrudan ve dolaylı bağlı çalışanlar) döndürür.
// User.manager alanı üzerinden genişlik-öncelikli arama yapar; döngüye karşı korumalıdır.
export async function getDownlineIds(userId: string): Promise<string[]> {
    const seen = new Set<string>([String(userId)]);
    const result: string[] = [];
    let frontier: string[] = [String(userId)];

    while (frontier.length > 0) {
        const children = await User.find({ manager: { $in: frontier }, isActive: { $ne: false } }).select('_id');
        const next: string[] = [];
        for (const c of children) {
            const id = String(c._id);
            if (!seen.has(id)) {
                seen.add(id);
                result.push(id);
                next.push(id);
            }
        }
        frontier = next;
    }

    return result;
}
