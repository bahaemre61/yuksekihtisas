import path from 'path';

// Toplantı kanıt dosyaları: yalnızca Word, PDF ve ZIP/RAR
export const MEETING_FILE_MAX_SIZE = 25 * 1024 * 1024; // 25MB
export const MEETING_FILE_MAX_COUNT = 10;
export const MEETING_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'meetings');

export const MEETING_ALLOWED_EXT: Record<string, string> = {
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
};

// Uzantı yalnızca iddiadır; dosyanın gerçek başlığı (magic bytes) uzantıyla uyuşmalı.
export function matchesSignature(ext: string, buf: Buffer): boolean {
  const startsWith = (sig: number[]) => sig.every((b, i) => buf[i] === b);
  switch (ext) {
    case '.pdf':
      return startsWith([0x25, 0x50, 0x44, 0x46]); // %PDF
    case '.doc':
      return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // OLE2
    case '.docx':
    case '.zip':
      return startsWith([0x50, 0x4b, 0x03, 0x04]) || startsWith([0x50, 0x4b, 0x05, 0x06]); // PK (boş zip: PK\5\6)
    case '.rar':
      return startsWith([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]); // Rar!\x1A\x07 (RAR4 ve RAR5)
    default:
      return false;
  }
}
