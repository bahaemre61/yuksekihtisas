// Teknik Servis (technical) ve Bilgi İşlem (it) taleplerinin rol bazlı yetki kuralları.
//  - Teknik Servis: admin + techamir atar, 'tech' rolü yapar
//  - Bilgi İşlem:   admin + itadmin atar, 'it' rolü yapar

export type RequestCategory = 'technical' | 'it';

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  technical: 'Teknik Servis',
  it: 'Bilgi İşlem',
};

export function parseCategory(value: unknown): RequestCategory | null {
  return value === 'technical' || value === 'it' ? value : null;
}

// Havuzu görebilir ve atama yapabilir
export function assignableCategories(role: string): RequestCategory[] {
  if (role === 'admin') return ['technical', 'it'];
  if (role === 'techamir') return ['technical'];
  if (role === 'itadmin') return ['it'];
  return [];
}

// Tüm talepleri listeleyebilir, atamayı kaldırabilir, iptal edebilir
export function manageableCategories(role: string): RequestCategory[] {
  if (role === 'admin') return ['technical', 'it'];
  if (role === 'supervisor' || role === 'techamir') return ['technical'];
  if (role === 'itadmin') return ['it'];
  return [];
}

// Kendisine atanan işleri görür ve tamamlar
export function workerCategories(role: string): RequestCategory[] {
  if (role === 'admin') return ['technical', 'it'];
  if (role === 'tech') return ['technical'];
  if (role === 'it') return ['it'];
  return [];
}

// Atanabilecek personelin rolü
export function staffRoleFor(category: RequestCategory): 'tech' | 'it' {
  return category === 'it' ? 'it' : 'tech';
}

// Mongo filtresi: technical sorgusu, kategorisi hiç olmayan eski kayıtları da kapsar
export function categoryFilter(categories: RequestCategory[]): Record<string, unknown> {
  if (categories.length === 2) return {};
  if (categories[0] === 'technical') return { category: { $ne: 'it' } };
  return { category: 'it' };
}
