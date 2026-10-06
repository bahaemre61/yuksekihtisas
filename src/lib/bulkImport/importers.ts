import User, { UserRole } from '../models/User';
import Location from '../Location';
import Announcement from '../models/Announcement';
import Menu from '../models/Menu';
import type { BatchItem, Importer, ParseResult } from './types';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------- Kullanıcılar
interface UserRow {
    name: string;
    email: string;
    password: string;
    role: string;
    managerEmail: string;
}

const usersImporter: Importer<UserRow> = {
    key: 'kullanicilar',
    label: 'Kullanıcılar',
    description: 'Toplu kullanıcı oluşturur. Amir (hiyerarşi) e-posta ile bağlanır; şifreler kaydedilirken otomatik şifrelenir.',
    fields: [
        { name: 'name', required: true, description: 'Ad Soyad' },
        { name: 'email', required: true, description: 'E-posta (benzersiz, giriş adı olarak kullanılır)' },
        { name: 'password', required: true, description: 'Şifre (en az 6 karakter). Aktarım sonrası JSON dosyasını silin!' },
        { name: 'role', required: false, description: `Rol: ${Object.values(UserRole).join(', ')} (varsayılan: user)` },
        { name: 'managerEmail', required: false, description: 'Bağlı olduğu amirin e-postası (sistemde ya da aynı dosyada olmalı)' }
    ],
    example: [
        { name: 'Ayşe Yılmaz', email: 'ayse.yilmaz@yuksekihtisas.edu.tr', password: 'Gecici123', role: 'amir' },
        { name: 'Mehmet Demir', email: 'mehmet.demir@yuksekihtisas.edu.tr', password: 'Gecici123', role: 'user', managerEmail: 'ayse.yilmaz@yuksekihtisas.edu.tr' }
    ],
    parse(raw): ParseResult<UserRow> {
        if (!isObject(raw)) return { error: 'Satır bir nesne olmalı.' };
        const name = str(raw.name);
        const email = str(raw.email);
        const password = typeof raw.password === 'string' ? raw.password : '';
        const role = str(raw.role) || UserRole.USER;
        const managerEmail = str(raw.managerEmail);

        if (!name) return { error: '"name" zorunlu.' };
        if (!EMAIL_RE.test(email)) return { error: '"email" geçersiz.' };
        if (password.length < 6) return { error: '"password" en az 6 karakter olmalı.' };
        if (!(Object.values(UserRole) as string[]).includes(role)) {
            return { error: `Geçersiz rol "${role}". Geçerli roller: ${Object.values(UserRole).join(', ')}` };
        }
        if (managerEmail && !EMAIL_RE.test(managerEmail)) return { error: '"managerEmail" geçersiz.' };
        if (managerEmail && managerEmail.toLowerCase() === email.toLowerCase()) return { error: 'Kullanıcı kendi amiri olamaz.' };
        return { data: { name, email, password, role, managerEmail } };
    },
    label_of: (d) => `${d.name} <${d.email}>`,
    uniqueKey: (d) => d.email.toLowerCase(),
    exists: async (d) => !!(await User.exists({ email: { $regex: `^${escapeRegex(d.email)}$`, $options: 'i' } })),
    async create(d) {
        // save() kullanılır: şifre hash'leme pre-save kancası insertMany'de çalışmaz
        const user = new User({
            name: d.name,
            email: d.email,
            password: d.password,
            role: d.role,
            driverStatus: d.role === UserRole.DRIVER ? 'available' : undefined
        });
        await user.save();
    },
    async crossCheck(items: BatchItem<UserRow>[]) {
        const problems = new Map<number, string>();
        const batchByEmail = new Map(items.map((i) => [i.data.email.toLowerCase(), i]));

        const withManager = items.filter((i) => i.data.managerEmail);
        const outside = [...new Set(
            withManager.map((i) => i.data.managerEmail.toLowerCase()).filter((e) => !batchByEmail.has(e))
        )];
        const found = new Set<string>();
        if (outside.length > 0) {
            const users = await User.find({ email: { $in: outside.map((e) => new RegExp(`^${escapeRegex(e)}$`, 'i')) } }).select('email');
            users.forEach((u: { email: string }) => found.add(u.email.toLowerCase()));
        }

        for (const item of withManager) {
            const m = item.data.managerEmail.toLowerCase();
            if (!batchByEmail.has(m) && !found.has(m)) {
                problems.set(item.index, `Amir bulunamadı: ${item.data.managerEmail}`);
            }
        }

        // Dosya içi döngü kontrolü (A -> B -> A)
        for (const item of withManager) {
            const visited = new Set<string>([item.data.email.toLowerCase()]);
            let cursor: BatchItem<UserRow> | undefined = batchByEmail.get(item.data.managerEmail.toLowerCase());
            while (cursor) {
                const email = cursor.data.email.toLowerCase();
                if (visited.has(email)) {
                    problems.set(item.index, 'Döngüsel hiyerarşi: amir zinciri kendisine geri dönüyor.');
                    break;
                }
                visited.add(email);
                cursor = cursor.data.managerEmail ? batchByEmail.get(cursor.data.managerEmail.toLowerCase()) : undefined;
            }
        }
        return problems;
    },
    async finalize(created) {
        const problems = new Map<number, string>();
        for (const item of created) {
            if (!item.data.managerEmail) continue;
            const manager = await User.findOne({ email: { $regex: `^${escapeRegex(item.data.managerEmail)}$`, $options: 'i' } }).select('_id');
            if (!manager) {
                problems.set(item.index, `Kullanıcı eklendi ama amir bağlanamadı (amir oluşturulamadı): ${item.data.managerEmail}`);
                continue;
            }
            await User.updateOne({ email: item.data.email }, { manager: manager._id });
        }
        return problems;
    }
};

// ---------------------------------------------------------------- Yerleşkeler
interface LocationRow { name: string }

const locationsImporter: Importer<LocationRow> = {
    key: 'yerleskeler',
    label: 'Yerleşkeler',
    description: 'Talep formlarında seçilen yerleşke / konum listesine toplu ekleme yapar.',
    fields: [{ name: 'name', required: true, description: 'Yerleşke adı (benzersiz)' }],
    example: [{ name: 'Yüksek İhtisas Diş Hekimliği Fakültesi (Yeni Yerleşke)' }],
    parse(raw): ParseResult<LocationRow> {
        // Düz metin listesi de kabul edilir: ["Yerleşke 1", "Yerleşke 2"]
        const name = typeof raw === 'string' ? raw.trim() : isObject(raw) ? str(raw.name) : '';
        if (!name) return { error: '"name" zorunlu.' };
        return { data: { name } };
    },
    label_of: (d) => d.name,
    uniqueKey: (d) => d.name.toLowerCase(),
    exists: async (d) => !!(await Location.exists({ name: d.name })),
    async create(d) {
        await Location.create({ name: d.name });
    }
};

// ---------------------------------------------------------------- Duyurular
interface AnnouncementRow { title: string; content: string; priority: 'normal' | 'urgent'; link: string }

const announcementsImporter: Importer<AnnouncementRow> = {
    key: 'duyurular',
    label: 'Duyurular',
    description: 'Toplu duyuru yayınlar. Başlığı ve içeriği aynı olan duyuru zaten varsa atlanır.',
    fields: [
        { name: 'title', required: true, description: 'Başlık' },
        { name: 'content', required: true, description: 'İçerik' },
        { name: 'priority', required: false, description: 'normal | urgent (varsayılan: normal)' },
        { name: 'link', required: false, description: 'Bağlantı (http/https ya da / ile başlayan site içi yol)' }
    ],
    example: [
        { title: 'Bakım Çalışması', content: 'Cumartesi 02:00-04:00 arası sistem bakımda olacaktır.', priority: 'urgent' },
        { title: 'Yeni Form Yayında', content: 'Kurumsal risk formu yakında.', link: '/dashboard/formlar/kurumsal-risk' }
    ],
    parse(raw): ParseResult<AnnouncementRow> {
        if (!isObject(raw)) return { error: 'Satır bir nesne olmalı.' };
        const title = str(raw.title);
        const content = str(raw.content);
        const priority = str(raw.priority) || 'normal';
        const link = str(raw.link ?? raw.href);
        if (!title) return { error: '"title" zorunlu.' };
        if (!content) return { error: '"content" zorunlu.' };
        if (priority !== 'normal' && priority !== 'urgent') return { error: '"priority" normal veya urgent olmalı.' };
        if (link && !/^(https?:\/\/|\/)/i.test(link)) return { error: '"link" http(s):// ya da / ile başlamalı.' };
        return { data: { title, content, priority, link } };
    },
    label_of: (d) => d.title,
    uniqueKey: (d) => `${d.title.toLowerCase()}\u0000${d.content.toLowerCase()}`,
    exists: async (d) => !!(await Announcement.exists({ title: d.title, content: d.content })),
    async create(d) {
        await Announcement.create({ title: d.title, content: d.content, priority: d.priority, link: d.link, href: d.link });
    }
};

// ---------------------------------------------------------------- Yemek menüsü
interface MenuRow { date: string; items: string[]; calories?: number }

const menuImporter: Importer<MenuRow> = {
    key: 'yemek-menusu',
    label: 'Yemek Menüsü',
    description: 'Günlük yemek menülerini ekler. O tarih için menü zaten varsa atlanır (üzerine yazılmaz).',
    fields: [
        { name: 'date', required: true, description: 'Tarih, YYYY-AA-GG biçiminde' },
        { name: 'items', required: true, description: 'Yemek listesi: ["Mercimek Çorbası", "Pilav"]' },
        { name: 'calories', required: false, description: 'Toplam kalori (sayı)' }
    ],
    example: [
        { date: '2026-10-05', items: ['Mercimek Çorbası', 'Izgara Tavuk', 'Pilav', 'Ayran'], calories: 850 },
        { date: '2026-10-06', items: ['Ezogelin Çorbası', 'Kuru Fasulye', 'Bulgur Pilavı', 'Cacık'] }
    ],
    parse(raw): ParseResult<MenuRow> {
        if (!isObject(raw)) return { error: 'Satır bir nesne olmalı.' };
        const date = str(raw.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
            return { error: '"date" YYYY-AA-GG biçiminde geçerli bir tarih olmalı.' };
        }
        if (!Array.isArray(raw.items) || raw.items.length === 0) return { error: '"items" en az bir yemek içeren dizi olmalı.' };
        const items = raw.items.map((i) => str(i)).filter(Boolean);
        if (items.length === 0) return { error: '"items" boş olamaz.' };
        let calories: number | undefined;
        if (raw.calories !== undefined && raw.calories !== null && raw.calories !== '') {
            calories = Number(raw.calories);
            if (!Number.isFinite(calories) || calories < 0) return { error: '"calories" geçerli bir sayı olmalı.' };
        }
        return { data: { date, items, calories } };
    },
    label_of: (d) => d.date,
    uniqueKey: (d) => d.date,
    // Menü API'si ile aynı biçimde (new Date('YYYY-AA-GG')) saklanır
    exists: async (d) => !!(await Menu.exists({ date: new Date(d.date) })),
    async create(d) {
        await Menu.create({ date: new Date(d.date), items: d.items, calories: d.calories });
    }
};

export const importers: Importer[] = [usersImporter, locationsImporter, announcementsImporter, menuImporter];

export const getImporter = (key: string) => importers.find((i) => i.key === key);
