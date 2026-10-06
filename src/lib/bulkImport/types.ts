// Toplu veri aktarımı: tüm veri tipleri (kullanıcı, yerleşke, duyuru...) aynı motoru kullanır.
// NOT: Bu klasör hem Next.js (API) hem de scripts/import-json.ts (ts-node) tarafından kullanıldığı için
// "@/..." alias'ı yerine göreli import kullanılır.

export interface FieldDoc {
    name: string;
    required: boolean;
    description: string;
}

export type ParseResult<T> = { data: T } | { error: string };

export interface BatchItem<T> {
    index: number; // JSON dizisindeki sıra (0'dan başlar)
    data: T;
}

export interface Importer<T = unknown> {
    key: string;
    label: string;
    description: string;
    fields: FieldDoc[];
    example: Record<string, unknown>[];

    // Tek bir ham JSON satırını doğrular / normalize eder
    parse(raw: unknown): ParseResult<T>;
    // Listede ve sonuç tablosunda görünecek kısa ad (gizli alan içermemeli!)
    label_of(data: T): string;
    // Aynı dosya içinde tekrar eden kayıtları yakalamak için benzersiz anahtar
    uniqueKey(data: T): string;
    // Veritabanında zaten varsa true (satır atlanır)
    exists(data: T): Promise<boolean>;
    // Satırı veritabanına yazar
    create(data: T): Promise<void>;
    // Opsiyonel: tüm satırlar görününce çapraz kontrol (ör. amir e-postası var mı). index -> hata mesajı
    crossCheck?(items: BatchItem<T>[]): Promise<Map<number, string>>;
    // Opsiyonel: tüm kayıtlar yazıldıktan sonra çalışır (ör. amir bağlantılarını kurma). Hata mesajı döner.
    finalize?(created: BatchItem<T>[]): Promise<Map<number, string>>;
}

export type RowStatus = 'will_create' | 'created' | 'skipped' | 'error';

export interface RowResult {
    index: number;
    label: string;
    status: RowStatus;
    message?: string;
}

export interface ImportSummary {
    total: number;
    willCreate: number;
    created: number;
    skipped: number;
    errors: number;
}

export interface ImportReport {
    type: string;
    dryRun: boolean;
    aborted: boolean; // hatalar yüzünden hiçbir şey yazılmadıysa true
    summary: ImportSummary;
    rows: RowResult[];
}

export interface RunOptions {
    dryRun: boolean;
    skipInvalid?: boolean; // true: hatalı satırlar atlanır, geçerli olanlar yazılır
}
