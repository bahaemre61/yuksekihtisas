const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const {
  CARD_BG,
  CARD_RATIO,
  CARD_FIELDS,
  CARD_PHOTO,
  CARD_BARCODE,
  mapCardData,
} = require("./cardLayout");

/* Kart genişliği (pt). Yükseklik kategori oranından hesaplanır. */
const CARD_W = 242.65;
const CARD_H = CARD_W / CARD_RATIO.ogrenci;

const MARGIN = 30;
const GAP = 12;
const A4_W = 595.28;
const COLS = 2;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;

const BG_DIR = path.join(__dirname, "..", "web", "assets", "card_tpl");
const FONT_DIR = "C:\\Windows\\Fonts";
const ARIAL = path.join(FONT_DIR, "arial.ttf");
const ARIAL_BOLD = path.join(FONT_DIR, "arialbd.ttf");

const INK = "#111111";

function registerFonts(doc) {
  doc.registerFont("AR", ARIAL);
  doc.registerFont("ARB", ARIAL_BOLD);
}

/* ---------- Fotoğraf (kutuyu tamamen kaplayacak şekilde kırp) ---------- */
function drawPhoto(pdf, photoPath, x, y, w, h) {
  pdf.save();
  pdf.rect(x, y, w, h).fillColor("#e8edf2").fill();
  if (photoPath && fs.existsSync(photoPath)) {
    try {
      const img = pdf.openImage(photoPath);
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      pdf.rect(x, y, w, h).clip();
      pdf.image(img, x + (w - dw) / 2, y + (h - dh) / 2, { width: dw, height: dh });
    } catch {
      // bozuk foto — boş kutu
    }
  } else {
    pdf.font("ARB").fontSize(6).fillColor("#9ca3af")
      .text("FOTO YOK", x, y + h / 2 - 3, { width: w, align: "center", lineBreak: false });
  }
  pdf.restore();
  pdf.save();
  pdf.rect(x, y, w, h).lineWidth(0.5).strokeColor("#cccccc").stroke();
  pdf.restore();
}

/* ---------- Barkod (panel önizlemesindeki SVG ile aynı desen) ---------- */
function drawBarcode(pdf, x, y, w, h, val) {
  const s = String(val || "").replace(/\D/g, "");
  pdf.save();
  pdf.rect(x, y, w, h).fillColor("#ffffff").fill();
  if (s) {
    const bars = [];
    let cx = 2;
    for (const ch of s) {
      const d = ch.charCodeAt(0);
      const bw = (d % 3) + 1;
      bars.push([cx, bw]);
      cx += bw + 1;
      bars.push([cx, 1]);
      cx += 2;
    }
    const scale = w / cx;
    pdf.fillColor("#0b1220");
    for (const [bx, bw] of bars) {
      pdf.rect(x + bx * scale, y, Math.max(0.4, bw * scale), h).fill();
    }
  }
  pdf.restore();
}

/* ---------- Tek metin katmanı (web/app.js textLayer + fitKartTexts) ---------- */
function drawField(pdf, card, f, val) {
  const text = String(val ?? "");
  if (!text.trim()) return;

  const { x, y, w, h } = card;
  const px = x + (f.l / 100) * w;
  const py = y + (f.t / 100) * h;
  const bold = (f.wt ?? ((f.k === "faken" || f.k === "progen" || f.k === "fakulte2") ? 400 : 700)) >= 700;
  const font = bold ? "ARB" : "AR";
  let size = ((f.f || 1) / 100) * w;

  // Dikey metin (seri no, barkod no, tarih)
  if (f.rot) {
    pdf.save();
    pdf.rotate(90, { origin: [px, py] });
    pdf.font(font).fontSize(size).fillColor(f.c || INK);
    pdf.text(text, px, py, { lineBreak: false, width: h });
    pdf.restore();
    return;
  }

  const boxW = f.w ? (f.w / 100) * w : null;
  const boxH = f.h ? (f.h / 100) * h : null;

  // Taşan yazıyı %3'lük adımlarla küçült (panel ile aynı davranış)
  if (boxW) {
    pdf.font(font).fontSize(size);
    let guard = 0;
    while (guard++ < 40 && size > 3 && pdf.widthOfString(text) > boxW - 2) {
      size *= 0.97;
      pdf.fontSize(size);
    }
  }

  if (f.cov && boxW && boxH) {
    pdf.save();
    pdf.rect(px, py, boxW, boxH).fillColor(f.cov).fill();
    pdf.restore();
  }

  const ty = f.cov && boxH ? py + (boxH - size) / 2 : py;
  const opts = { lineBreak: false, align: f.al || "left" };
  if (boxW) opts.width = boxW - (f.cov ? 4 : 2);

  pdf.font(font).fontSize(size).fillColor(f.c || INK);
  pdf.text(text, px + (f.cov ? 2 : 0), ty, opts);
}

/* ---------- Kartın bir yüzü ---------- */
function drawCardSide(pdf, side, category, data, photoPath, x, y, idx) {
  const cat = CARD_FIELDS[category] ? category : "ogrenci";
  const ratio = CARD_RATIO[cat] || CARD_RATIO.ogrenci;
  const w = CARD_W;
  const h = w / ratio;

  const bgFile = (CARD_BG[cat] || {})[side];
  const bgPath = bgFile ? path.join(BG_DIR, bgFile) : null;
  if (bgPath && fs.existsSync(bgPath)) {
    pdf.image(bgPath, x, y, { width: w, height: h });
  } else {
    pdf.save();
    pdf.rect(x, y, w, h).fillColor("#ffffff").fill();
    pdf.restore();
  }

  const m = mapCardData(data, cat, idx);
  const card = { x, y, w, h };

  for (const f of (CARD_FIELDS[cat] || {})[side] || []) {
    drawField(pdf, card, f, m[f.k] || "");
  }

  if (side === "front" && CARD_PHOTO[cat]) {
    const p = CARD_PHOTO[cat];
    drawPhoto(pdf, photoPath, x + (p.l / 100) * w, y + (p.t / 100) * h, (p.w / 100) * w, (p.h / 100) * h);
  }

  if (side === "back" && CARD_BARCODE[cat]) {
    const b = CARD_BARCODE[cat];
    drawBarcode(pdf, x + (b.l / 100) * w, y + (b.t / 100) * h, (b.w / 100) * w, (b.h / 100) * h, m.barkodno || m.seri);
  }

  return h;
}

/* ---------- A4 ızgara (2x4) ---------- */
function gridPos(i, cardH) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const cellW = (A4_W - MARGIN * 2 - GAP) / COLS;
  const x = MARGIN + col * (cellW + GAP) + (cellW - CARD_W) / 2;
  const y = MARGIN + row * (cardH + GAP);
  return [x, y];
}

/* ---------- Tek kart PDF (ön + arka) ---------- */
function generateSinglePdf(category, data, photoPath, outPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, info: { Title: "OtoKart - Tek Kart" } });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    registerFonts(doc);

    drawCardSide(doc, "front", category, data, photoPath, MARGIN, MARGIN, 0);
    doc.addPage();
    drawCardSide(doc, "back", category, data, photoPath, MARGIN, MARGIN, 0);

    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

/* ---------- Toplu basım PDF (önler sayfa 1..N, arkalar sayfa N+1..) ---------- */
function generatePrintPdf(category, items, outPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, info: { Title: "OtoKart - Basim" } });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    registerFonts(doc);

    const cat = CARD_FIELDS[category] ? category : "ogrenci";
    const cardH = CARD_W / (CARD_RATIO[cat] || CARD_RATIO.ogrenci);

    items.forEach((item, i) => {
      if (i > 0 && i % PER_PAGE === 0) doc.addPage();
      const [x, y] = gridPos(i % PER_PAGE, cardH);
      drawCardSide(doc, "front", cat, item.data, item.photoPath, x, y, i);
    });

    if (items.length === 0) {
      doc.font("AR").fontSize(12).fillColor("#666").text("Kart bulunamadi", MARGIN, MARGIN);
    }

    // Arka yüzler: aynı yerleşim, uzun kenar dupleks uyumlu
    for (let i = 0; i < items.length; i++) {
      if (i % PER_PAGE === 0) doc.addPage();
      const [x, y] = gridPos(i % PER_PAGE, cardH);
      drawCardSide(doc, "back", cat, items[i].data, items[i].photoPath, x, y, i);
    }

    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

module.exports = { generateSinglePdf, generatePrintPdf, drawCardSide, CARD_W, CARD_H };
