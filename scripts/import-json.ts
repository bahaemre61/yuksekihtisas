// Komut satırından toplu JSON aktarımı (panelle aynı motoru kullanır).
//
//   npm run import -- <tip> <dosya.json>            -> kuru çalıştırma (hiçbir şey yazmaz)
//   npm run import -- <tip> <dosya.json> --run      -> gerçekten yazar
//   npm run import -- <dosya.json> --run            -> tip, dosyadaki {"type": "..."} alanından okunur
//   Ek bayrak: --skip-invalid  (hatalı satırları atla, geçerlileri yaz)
//
// Tipler: kullanicilar | yerleskeler | duyurular | yemek-menusu
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getImporter, importers } from '../src/lib/bulkImport/importers';
import { extractRows, runImport } from '../src/lib/bulkImport/runner';

const ICONS = { will_create: '＋', created: '✅', skipped: '⏭ ', error: '❌' } as const;

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const positional = args.filter((a) => !a.startsWith('--'));

  const file = positional.find((a) => a.toLowerCase().endsWith('.json'));
  let type = positional.find((a) => a !== file);

  if (!file) {
    console.error(`Kullanım: npm run import -- <tip> <dosya.json> [--run] [--skip-invalid]\nTipler: ${importers.map((i) => i.key).join(', ')}`);
    process.exit(1);
  }

  const parsedFile = extractRows(JSON.parse(fs.readFileSync(path.resolve(file), 'utf-8')));
  if ('error' in parsedFile) throw new Error(parsedFile.error);
  type = type || parsedFile.type;

  const importer = type ? getImporter(type) : undefined;
  if (!importer) throw new Error(`Geçersiz ya da eksik tip "${type ?? ''}". Tipler: ${importers.map((i) => i.key).join(', ')}`);

  if (!process.env.MONGO_URI) throw new Error('MONGO_URI .env dosyasında bulunamadı!');
  await mongoose.connect(process.env.MONGO_URI);

  const dryRun = !flags.has('--run');
  console.log(`\n${importer.label} — ${parsedFile.rows.length} satır — ${dryRun ? 'KURU ÇALIŞTIRMA (yazılmaz)' : 'GERÇEK AKTARIM'}\n`);

  const report = await runImport(importer, parsedFile.rows, { dryRun, skipInvalid: flags.has('--skip-invalid') });

  for (const r of report.rows) {
    console.log(`${ICONS[r.status]} #${r.index + 1} ${r.label}${r.message ? ` — ${r.message}` : ''}`);
  }
  const s = report.summary;
  console.log(`\nToplam ${s.total} | eklenecek ${s.willCreate} | eklendi ${s.created} | atlandı ${s.skipped} | hata ${s.errors}`);
  if (report.aborted) console.log('⚠️  Hatalar olduğu için HİÇBİR şey yazılmadı. Düzeltin ya da --skip-invalid kullanın.');
  if (dryRun) console.log('Gerçekten yazmak için komuta --run ekleyin.');

  await mongoose.disconnect();
  process.exit(report.aborted || s.errors > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('❌ HATA:', err.message || err);
  process.exit(1);
});
