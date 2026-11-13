/* OtoKart Web Panel */
// Alt yolda (ornegin portalde /kart-basim/) calisabilmesi icin onek sayfa adresinden bulunur
const API = location.pathname.replace(/\/[^/]*$/, "");
let SESSION = null;
let SESSION_ROLE = "operator";
let SESSION_USER = null;
let CATEGORIES = [];
let currentBatch = null;
let excelState = null; // { filename, mapping }
let manualCards = [];
let manualPhotoFile = null;

const ROLE_LABELS = {
  admin: "Yönetici",
  ogrenci_isleri: "Öğrenci İşleri",
  personel_daire: "Personel Daire Başkanlığı",
  akademik: "Akademik Personel",
  idari: "İdari Personel",
  operator: "Operatör",
};
const ROLE_BADGE = {
  admin: "Yönetici",
  ogrenci_isleri: "Öğrenci İşleri",
  personel_daire: "Personel Daire",
  akademik: "Akademik",
  idari: "İdari",
  operator: "Operatör",
};
const isAdmin = () => SESSION_ROLE === "admin";
const canUseMail = () => ["admin", "ogrenci_isleri", "personel_daire"].includes(SESSION_ROLE);

const $ = (id) => document.getElementById(id);
const api = async (path, opts = {}) => {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(SESSION ? { "x-session": SESSION } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hata oluştu");
  return data;
};

/* ---------- Auth ---------- */
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: $("loginUser").value, password: $("loginPass").value }),
    });
    SESSION = data.token;
    SESSION_ROLE = data.role || "operator";
    SESSION_USER = data.username;
    localStorage.setItem("otokart_session", SESSION);
    localStorage.setItem("otokart_user", data.username);
    localStorage.setItem("otokart_role", SESSION_ROLE);
    enterApp(data.username, data.role || "operator");
  } catch (err) {
    $("loginError").textContent = err.message;
    $("loginError").classList.remove("hidden");
  }
});

$("logoutBtn").addEventListener("click", () => {
  SESSION = null;
  SESSION_ROLE = "operator";
  SESSION_USER = null;
  localStorage.removeItem("otokart_session");
  localStorage.removeItem("otokart_user");
  localStorage.removeItem("otokart_role");
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
});

async function enterApp(username, role) {
  SESSION_USER = username;
  // Oturumu sunucu uzerinde dogrula (gecersizse login'e dondurur)
  await api("/api/settings");
  SESSION_ROLE = role || "operator";
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userLabel").textContent = username;
  $("userRole").textContent = ROLE_LABELS[SESSION_ROLE] || SESSION_ROLE;
  $("userAvatar").textContent = (username || "?").slice(0, 2).toUpperCase();
  $("kbRoleBadge").textContent = ROLE_BADGE[SESSION_ROLE] || SESSION_ROLE;

  // Rol bazli menu gorunurlugu
  const showIf = (id, cond) => { const el = $(id); if (el) el.classList.toggle("hidden", !cond); };
  showIf("navDashboard", isAdmin());
  showIf("navMail", canUseMail());
  showIf("navUsers", isAdmin());
  showIf("navLogs", isAdmin());
  showIf("teamSection", isAdmin());
  showIf("kbRoleFilter", isAdmin());

  CATEGORIES = await api("/api/categories");
  fillCategorySelects();
  UNIVERSITY_DATA = await api("/api/university");
  showView("kartBasim");
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === "kartBasim"));
}

/* ---------- Navigation ---------- */
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    showView(btn.dataset.view);
  });
});

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const el = $("view-" + name);
  if (el) el.classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name || (name === "batchDetail" && b.dataset.view === "kartBasim"));
  });
  if (name === "kartBasim") loadKartBasim();
  if (name === "dashboard") loadDashboard();
  if (name === "mail") loadMail();
  if (name === "users") loadUsers();
  if (name === "logs") loadLogs();
}

/* ---------- Category selects ---------- */
function fillCategorySelects() {
  const opts = CATEGORIES.map((c) => `<option value="${c.key}">${c.label}</option>`).join("");
  for (const id of ["excelCategory", "manualCategory"]) {
    const el = $(id);
    if (el) el.innerHTML = opts;
  }
  const allOpts = `<option value="">Tüm kategoriler</option>` + opts;
  for (const id of ["mailInstantCategory", "mailDailyCategory", "mailWeeklyCategory"]) {
    const el = $(id);
    if (el) el.innerHTML = allOpts;
  }
  updateSampleHint();
}

/* ---------- Ornek liste (secilen kategori) ---------- */
const SAMPLE_HINTS = {
  ogrenci: "T.C.Kimlik No_20 · Öğrenci No_20 · Adı_20 · Soyadı_20 · Fakülte_20 · Fakülte_INGILIZCE · Program_20 · Program_INGILIZCE",
  stajer: "T.C.Kimlik No_20 · Öğrenci No_20 · Adı_20 · Soyadı_20 · Fakülte_20 · Fakülte_INGILIZCE · Program_20 · Program_INGILIZCE",
  intorn: "T.C.Kimlik No_20 · Öğrenci No_20 · Adı_20 · Soyadı_20 · Fakülte_20 · Fakülte_INGILIZCE · Program_20 · Program_INGILIZCE",
  akademik: "T.C.Kimlik No_20 · Personel No_20 · Adı_20 · Soyadı_20 · Unvan_20 · Fakülte_20 · Fakülte_INGILIZCE · Program_20 · Program_INGILIZCE",
  idari: "Sicil No · Tc No · Görevi · Soyadı · Adı · Birimi",
};

function updateSampleHint() {
  const cat = $("excelCategory")?.value;
  const isStaff = cat === "akademik" || cat === "idari";
  const el = $("sampleFormatHint");
  if (el && SAMPLE_HINTS[cat]) el.textContent = SAMPLE_HINTS[cat];

  const tip = $("excelCategoryTip");
  if (tip) {
    tip.innerHTML = isStaff
      ? '<span class="font-semibold text-slate-700">İpucu:</span> Fotoğraf dosya adı T.C. Kimlik No ise otomatik eşleşir (örn. 10000000444.jpg).'
      : '<span class="font-semibold text-slate-700">İpucu:</span> Fotoğraf dosya adı öğrenci no ise otomatik eşleşir (örn. 2601010917.jpg).';
  }
  const dropHint = $("photoDropHint");
  if (dropHint) {
    dropHint.innerHTML = isStaff
      ? '<span class="text-brandred font-semibold">Çoklu seçim</span> · dosya adı = T.C. Kimlik No'
      : '<span class="text-brandred font-semibold">Çoklu seçim</span> · dosya adı = öğrenci no';
  }
  const stepPhoto = $("stepPhotoLi");
  if (stepPhoto) {
    stepPhoto.innerHTML = isStaff
      ? '<span class="step">2</span> Fotoğrafları T.C. Kimlik No ile adlandırın: <code class="rounded bg-slate-100 px-1">10000000444.jpg</code>'
      : '<span class="step">2</span> Fotoğrafları numara ile adlandırın: <code class="rounded bg-slate-100 px-1">2601010917.jpg</code>';
  }
}

window.downloadSampleExcel = async function (btn) {
  const category = $("excelCategory")?.value || "ogrenci";
  const label = btn ? btn.textContent : null;
  try {
    if (btn) { btn.disabled = true; btn.textContent = "İndiriliyor…"; }
    const res = await fetch(`${API}/api/sample-excel?category=${encodeURIComponent(category)}`, { headers: { "x-session": SESSION } });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || "Örnek liste oluşturulamadı");
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ornek_${category}_listesi.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
  }
};
$("excelCategory")?.addEventListener("change", updateSampleHint);
$("downloadSampleExcel")?.addEventListener("click", function () { downloadSampleExcel(this); });

/* ---------- data-goto ---------- */
document.querySelectorAll("[data-goto]").forEach((b) => {
  b.addEventListener("click", () => {
    const view = b.dataset.goto;
    showView(view);
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  });
});

/* Panel sözlüğü göster/gizle */
$("glossaryToggle")?.addEventListener("click", () => {
  const body = $("glossaryBody");
  if (body) body.classList.toggle("hidden");
});

/* ---------- Dashboard ---------- */
async function loadDashboard() {
  const s = await api("/api/stats");
  $("statGrid").innerHTML = `
    <div class="stat"><div class="num">${s.batches}</div><div class="lbl">Basım İşlemi</div></div>
    <div class="stat"><div class="num">${s.cards}</div><div class="lbl">Toplam Kart</div></div>
    <div class="stat"><div class="num">${s.pending}</div><div class="lbl">Bekleyen</div></div>
    <div class="stat"><div class="num">${s.printed}</div><div class="lbl">Basıma Gönderildi</div></div>
  `;

  // Ekip takibi (sadece admin)
  const teamSection = $("teamSection");
  const teamGrid = $("teamGrid");
  if (teamSection && teamGrid) {
    if (isAdmin() && Array.isArray(s.byRole) && s.byRole.length) {
      teamGrid.innerHTML = s.byRole.map((t) => `
        <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div class="flex items-center justify-between gap-2">
            <div class="font-bold text-slate-800">${esc(t.label)}</div>
            <span class="badge draft">${t.users || 0} kullanıcı</span>
          </div>
          <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div class="rounded-lg bg-white border border-slate-100 py-2"><div class="text-lg font-extrabold text-slate-900">${t.batches}</div><div class="text-[10px] uppercase tracking-wide text-slate-500">İşlem</div></div>
            <div class="rounded-lg bg-white border border-slate-100 py-2"><div class="text-lg font-extrabold text-slate-900">${t.cards}</div><div class="text-[10px] uppercase tracking-wide text-slate-500">Kart</div></div>
            <div class="rounded-lg bg-white border border-slate-100 py-2"><div class="text-lg font-extrabold text-emerald-600">${t.printed}</div><div class="text-[10px] uppercase tracking-wide text-slate-500">Gönderildi</div></div>
            <div class="rounded-lg bg-white border border-slate-100 py-2"><div class="text-lg font-extrabold text-amber-600">${t.pending}</div><div class="text-[10px] uppercase tracking-wide text-slate-500">Bekleyen</div></div>
          </div>
          <div class="mt-2 text-[11px] text-slate-500">Son işlem: ${trDateTime(t.lastActivity)}</div>
        </div>
      `).join("");
      teamSection.classList.remove("hidden");
    } else {
      teamSection.classList.add("hidden");
    }
  }

  const batches = await api("/api/batches");
  $("recentList").innerHTML = batches.slice(0, 6).map((b) => `
    <div class="list-row">
      <div>
        <div><b>${esc(b.name)}</b> <span class="badge ${badgeClass(b)}">${statusLabel(b)}</span>
          ${b.created_by_role ? `<span class="badge draft" style="margin-left:4px">${esc(ROLE_BADGE[b.created_by_role] || b.created_by_role)}</span>` : ""}
        </div>
        <div class="meta">${b.card_count} kart · ${b.matched_count ?? 0} fotoğraf · ${esc(b.created_by || "—")} · ${trDateTime(b.created_at)}${b.mail_sent_at ? " · 📧 gönderildi" : ""}</div>
      </div>
      <button class="btn small" onclick="openBatch(${b.id})">Aç</button>
    </div>
  `).join("") || `<p class="hint">Henüz işlem yok.</p>`;
}

function statusLabel(b) {
  return b && b.mail_sent_at ? "Basıma Gönderildi" : "Taslak";
}
function badgeClass(b) {
  return b && b.mail_sent_at ? "printed" : "draft";
}

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
    $(t.dataset.tab).classList.remove("hidden");
  });
});

/* ---------- Excel upload + mapping ---------- */
const excelDrop = $("excelDrop");
excelDrop.addEventListener("click", () => $("excelFile").click());
excelDrop.addEventListener("dragover", (e) => { e.preventDefault(); excelDrop.classList.add("over"); });
excelDrop.addEventListener("dragleave", () => excelDrop.classList.remove("over"));
excelDrop.addEventListener("drop", (e) => {
  e.preventDefault(); excelDrop.classList.remove("over");
  if (e.dataTransfer.files[0]) handleExcelFile(e.dataTransfer.files[0]);
});
$("excelFile").addEventListener("change", (e) => { if (e.target.files[0]) handleExcelFile(e.target.files[0]); });

async function handleExcelFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  try {
    closeBatchPreview();
    const data = await api("/api/excel/analyze", { method: "POST", body: fd });
    excelState = { filename: data.filename, suggested: data.suggested, headers: data.headers };
    $("mappingBox").classList.remove("hidden");
    $("mappingList").innerHTML = data.headers.map((h, i) => `
      <div class="mapping-row">
        <span class="hdr">${h || "(boş)"}</span>
        <select data-idx="${i}">
          <option value="">— yok —</option>
          ${fieldOptions(data.suggested[i])}
        </select>
      </div>
    `).join("");
    $("samplePreview").textContent = `Toplam ${data.total} kayıt bulundu. Örnek: ` +
      (data.sample[0] ? Object.values(data.sample[0]).join(" | ") : "yok");
    $("createBatchBtn").disabled = false;
    $("createBatchBtn").textContent = `Listeyi Yükle ve Önizle (${data.total} kayıt)`;
  } catch (err) {
    alert(err.message);
  }
}

function fieldOptions(selected) {
  const fields = [
    ["tc_no", "T.C. Kimlik No"], ["ogrenci_no", "Öğrenci No"], ["personel_no", "Personel/Sicil No"], ["personel_unvan", "Ünvan"],
    ["ad", "Ad"], ["soyad", "Soyad"],
    ["fakulte_tr", "Fakülte (TR)"], ["fakulte_en", "Fakülte (EN)"],
    ["program_tr", "Program (TR)"], ["program_en", "Program (EN)"],
    ["unite_tr", "Ünite (TR)"], ["unite_en", "Ünite (EN)"],
  ];
  return fields.map(([v, l]) => `<option value="${v}" ${selected === v ? "selected" : ""}>${l}</option>`).join("");
}

/* ---------- Excel sekmesi: opsiyonel fotoğraflar ---------- */
let batchPhotos = []; // File[] — seçilen fotoğraflar
const batchPhotoDrop = $("batchPhotoDrop");
batchPhotoDrop.addEventListener("click", () => $("batchPhotoFiles").click());
batchPhotoDrop.addEventListener("dragover", (e) => { e.preventDefault(); batchPhotoDrop.classList.add("over"); });
batchPhotoDrop.addEventListener("dragleave", () => batchPhotoDrop.classList.remove("over"));
batchPhotoDrop.addEventListener("drop", (e) => {
  e.preventDefault(); batchPhotoDrop.classList.remove("over");
  addBatchPhotos(e.dataTransfer.files);
});
$("batchPhotoFiles").addEventListener("change", (e) => { addBatchPhotos(e.target.files); e.target.value = ""; });

function addBatchPhotos(fileList) {
  for (const f of fileList) if (f.type.startsWith("image/")) batchPhotos.push(f);
  renderBatchPhotos();
}

function renderBatchPhotos() {
  const box = $("batchPhotoList");
  if (!batchPhotos.length) { box.innerHTML = ""; return; }
  box.innerHTML = `
    <p class="hint">${batchPhotos.length} fotoğraf seçildi — dosya adındaki rakamlar kart numarasıyla eşleşir.</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
      ${batchPhotos.map((f, i) => `
        <div style="display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:4px 8px;font-size:12px;max-width:220px">
          <img src="${URL.createObjectURL(f)}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:4px" />
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span>
          <button class="btn small danger" data-i="${i}" title="Çıkar" style="padding:1px 7px">?</button>
        </div>`).join("")}
    </div>`;
  box.querySelectorAll("button[data-i]").forEach((b) =>
    b.addEventListener("click", (e) => { e.stopPropagation(); batchPhotos.splice(+b.dataset.i, 1); renderBatchPhotos(); }));
}

/* ---------- Excel önizleme + sağ alt onay ---------- */
let pendingPreview = null; // { total, rows, report, mapping, category, filename }
let previewObjectUrls = [];

function slugifyName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function photoKeyOf(name) {
  return String(name || "").replace(/\.[^.]+$/, "").replace(/[^\d]/g, "");
}

function nameKeyOf(name) {
  return slugifyName(name);
}

function findPreviewPhoto(index, row) {
  const numCandidates = [row.ogrenci_no, row.personel_no, row.tc_no].filter(Boolean).map(String);
  for (const c of numCandidates) if (index.has(c)) return index.get(c);
  // Dosya adında numara geçiyorsa (örn. 2601010917_1.jpg)
  for (const c of numCandidates) {
    if (c.length < 4) continue;
    for (const [k, f] of index) if (k.includes(c)) return f;
  }
  // Isim soyisim ile eslestirme (akademik / idari icin)
  // Hem normalize (ASCII) hem orijinal (Turkce karakterli) dene
  const nameCands = [];
  if (row.ad && row.soyad) {
    nameCands.push(nameKeyOf(`${row.ad}_${row.soyad}`));
    nameCands.push(nameKeyOf(`${row.soyad}_${row.ad}`));
    nameCands.push(`${row.ad}_${row.soyad}`.toLowerCase().trim().replace(/\s+/g, "_"));
    nameCands.push(`${row.soyad}_${row.ad}`.toLowerCase().trim().replace(/\s+/g, "_"));
  }
  if (row.ad) nameCands.push(nameKeyOf(row.ad), row.ad.toLowerCase().trim());
  if (row.soyad) nameCands.push(nameKeyOf(row.soyad), row.soyad.toLowerCase().trim());
  for (const n of nameCands) {
    if (!n) continue;
    if (index.has(n)) return index.get(n);
    for (const [k, f] of index) if (k.includes(n)) return f;
  }
  return null;
}

function clearPreviewUrls() {
  previewObjectUrls.forEach((u) => URL.revokeObjectURL(u));
  previewObjectUrls = [];
}

function closeBatchPreview() {
  const modal = $("batchPreviewModal");
  if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
  $("confirmBar")?.classList.add("hidden");
  clearPreviewUrls();
  pendingPreview = null;
  if ($("previewGrid")) $("previewGrid").innerHTML = "";
  if ($("previewMore")) $("previewMore").textContent = "";
  if ($("previewStats")) $("previewStats").innerHTML = "";
}

function showBatchPreview() {
  if (!pendingPreview) return;
  clearPreviewUrls();

  const rows = pendingPreview.rows || [];
  const index = new Map();
  for (const f of batchPhotos) {
    const k = photoKeyOf(f.name);
    if (k && !index.has(k)) index.set(k, f);
    // Isim-soyisim icin de indexle (hem orijinal Turkce karakterli hem normalize)
    const base = String(f.name).replace(/\.[^.]+$/, "");
    if (base && !index.has(base.toLowerCase())) index.set(base.toLowerCase(), f);
    const nk = nameKeyOf(base);
    if (nk && !index.has(nk)) index.set(nk, f);
  }

  let matched = 0;
  const cards = rows.map((row) => {
    const file = findPreviewPhoto(index, row);
    let url = null;
    if (file) {
      url = URL.createObjectURL(file);
      previewObjectUrls.push(url);
      matched++;
    }
    return { row, url };
  });

  const missingPhoto = rows.length - matched;
  const fieldMissing = pendingPreview.report?.affected || 0;
  const catLabel = $("excelCategory").selectedOptions[0]?.text || pendingPreview.category;

  $("previewSubtitle").textContent = `${catLabel} · ${excelState?.filename ? "Excel listesi" : ""} · ${rows.length} kayıt`;
  const chip = (cls, text) => `<span class="chip ${cls}" style="cursor:default">${text}</span>`;
  $("previewStats").innerHTML = `
    <div class="flex items-center gap-1.5 flex-wrap">
      ${chip("chip-active", `${rows.length} kart`)}
      ${chip(matched === rows.length ? "chip-active" : "chip-missing", `${matched} fotoğraf eşleşti`)}
      ${missingPhoto ? chip("chip-missing", `${missingPhoto} fotoğraf eksik`) : ""}
      ${fieldMissing ? chip("chip-missing", `${fieldMissing} kartta alan eksik`) : ""}
    </div>`;

  const LIMIT = 12;
  $("previewGrid").innerHTML = cards.slice(0, LIMIT).map(({ row, url }, i) => {
    const name = `${row.ad || ""} ${row.soyad || ""}`.trim() || "İsimsiz";
    return `
      <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
        <div class="flex items-center gap-2 mb-2 pl-1">
          <span class="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md px-2 py-0.5">#${String(i + 1).padStart(4, "0")}</span>
          <span class="text-sm font-bold text-slate-700 truncate">${esc(name)}</span>
          <span class="badge ${url ? "printed" : "pending"}" style="margin-left:auto">${url ? "Fotoğraf ✓" : "Fotoğraf eksik"}</span>
        </div>
        ${cardHtml({ ...row }, url, pendingPreview.category)}
      </div>`;
  }).join("") || `<p class="py-10 text-center text-sm text-slate-400">Liste boş görünüyor — sütun eşleştirmesini kontrol edin.</p>`;

  $("previewMore").textContent = rows.length > LIMIT
    ? `+${rows.length - LIMIT} kart daha — onayladıktan sonra iş detayında tümü görünecek.`
    : "Tüm kartlar yukarıda. Sağ alttaki onay butonuna basmadan hiçbir kayıt oluşturulmaz.";

  $("confirmBarTitle").textContent = `${rows.length} kart onaya hazır`;
  $("confirmBarSub").textContent = `${matched}/${rows.length} fotoğraf eşleşti${fieldMissing ? ` · ${fieldMissing} kartta alan eksik` : ""} · Onaylamadan kayıt oluşturulmaz.`;
  $("confirmBar").classList.remove("hidden");

  const modal = $("batchPreviewModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.scrollTop = 0;
  requestAnimationFrame(() => fitKartTexts($("previewGrid")));
}

function cancelBatchPreview() {
  closeBatchPreview();
}

async function confirmPendingBatch() {
  if (!pendingPreview) return;
  const btn = $("previewConfirmBtn");
  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Yükleniyor…";
  const { mapping, category, filename } = pendingPreview;
  try {
    // a) Fotoğrafları yükle
    let uploaded = 0;
    if (batchPhotos.length) {
      const fd = new FormData();
      batchPhotos.forEach((f) => fd.append("photos", f));
      const r = await api(`/api/photos/${category}`, { method: "POST", body: fd });
      uploaded = r.count || 0;
    }
    // b) Onaydan sonra batch oluştur
    const data = await api("/api/batches", {
      method: "POST",
      body: JSON.stringify({
        category,
        source: "excel",
        filename,
        mapping,
        name: `${$("excelCategory").selectedOptions[0].text} - Excel Listesi`,
      }),
    });
    // c) Geri bildirim
    let msg = "";
    if (uploaded) {
      const b = await api(`/api/batches/${data.batchId}`);
      const matched = (b.cards || []).filter((c) => c.photo_url).length;
      msg = `${uploaded} fotoğraf yüklendi, ${matched} kart ile eşleşti.`;
    }
    $("batchCreateFeedback").textContent = msg;
    batchPhotos = [];
    renderBatchPhotos();
    closeBatchPreview();
    openBatch(data.batchId);
    if (msg) alert(msg);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
}

$("createBatchBtn").addEventListener("click", async () => {
  if (!excelState) return;
  const mapping = {};
  document.querySelectorAll("#mappingList select").forEach((sel) => {
    if (sel.value) mapping[sel.dataset.idx] = sel.value;
  });
  const category = $("excelCategory").value;
  const btn = $("createBatchBtn");
  btn.disabled = true;
  const prevText = btn.textContent;
  try {
    const data = await api("/api/excel/preview", {
      method: "POST",
      body: JSON.stringify({ filename: excelState.filename, mapping, category }),
    });
    pendingPreview = { ...data, mapping, category, filename: excelState.filename };
    showBatchPreview();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
});

$("previewCloseBtn")?.addEventListener("click", cancelBatchPreview);
$("previewCancelBtn")?.addEventListener("click", cancelBatchPreview);
$("previewConfirmBtn")?.addEventListener("click", confirmPendingBatch);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pendingPreview) cancelBatchPreview();
});

/* ---------- Manuel tek kart ---------- */

/* Kategori bazli alan tanimlari.
   Ogrenci/Stajer/Intorn: Ogrenci No, Unvan yok.
   Akademik/Idari: Personel No ve Unvan, fakulte/birim alanlari. */
const MANUAL_FIELD_DEFS = {
  ogrenci: [
    ["tc_no", "T.C. Kimlik No"], ["ogrenci_no", "Öğrenci No"],
    ["ad", "Ad"], ["soyad", "Soyad"],
    ["fakulte_tr", "Fakülte (TR)"], ["fakulte_en", "Fakülte (EN)"],
    ["program_tr", "Program (TR)"], ["program_en", "Program (EN)"],
  ],
  stajer: [
    ["tc_no", "T.C. Kimlik No"], ["ogrenci_no", "Öğrenci No"],
    ["ad", "Ad"], ["soyad", "Soyad"],
    ["fakulte_tr", "Fakülte (TR)"], ["fakulte_en", "Fakülte (EN)"],
    ["program_tr", "Program (TR)"], ["program_en", "Program (EN)"],
  ],
  intorn: [
    ["tc_no", "T.C. Kimlik No"], ["ogrenci_no", "Öğrenci No"],
    ["ad", "Ad"], ["soyad", "Soyad"],
    ["fakulte_tr", "Fakülte (TR)"], ["fakulte_en", "Fakülte (EN)"],
    ["program_tr", "Program (TR)"], ["program_en", "Program (EN)"],
  ],
  akademik: [
    ["tc_no", "T.C. Kimlik No"], ["personel_no", "Personel/Sicil No"], ["personel_unvan", "Ünvan"],
    ["ad", "Ad"], ["soyad", "Soyad"],
    ["fakulte_tr", "Fakülte"],
    ["program_tr", "Ana Bilim Dalı"],
  ],
  idari: [
    ["tc_no", "T.C. Kimlik No"], ["personel_no", "Personel/Sicil No"], ["personel_unvan", "Görevi"],
    ["ad", "Ad"], ["soyad", "Soyad"],
    ["fakulte_tr", "Birim"],
  ],
};

/* Universite fakulte/bolum verisi — /api/university'den yuklenir. */
let UNIVERSITY_DATA = null;

/* Seçili fakulteye gore bolum onerileri */
function programsForFaculty(facultyTr) {
  if (!UNIVERSITY_DATA) return [];
  const fac = UNIVERSITY_DATA.find((f) => f.faculty === facultyTr);
  return fac ? fac.programs : [];
}

function renderManualFields(category) {
  const defs = MANUAL_FIELD_DEFS[category] || MANUAL_FIELD_DEFS.ogrenci;
  $("manualFields").innerHTML = defs.map(([k, l]) => {
    const isAkademik = category === "akademik";
    const isIdari = category === "idari";
    const suggestField = ((k === "fakulte_tr" || k === "program_tr" || k === "fakulte_en" || k === "program_en") && !isIdari)
      || (k === "personel_unvan" && isAkademik);
    return `
      <label class="manual-field-label">
        <span class="manual-field-title">${l}</span>
        <input type="text" data-k="${k}" class="mf form-input${suggestField ? " suggest" : ""}" placeholder="${l}" autocomplete="off" />
        ${suggestField ? `<ul class="suggest-list" id="sugg-${k}"></ul>` : ""}
      </label>
    `;
  }).join("");

  document.querySelectorAll(".mf").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      renderManualPreview();
      handleSuggestInput(e.target);
    });
    inp.addEventListener("focus", (e) => {
      if (e.target.classList.contains("suggest")) handleSuggestInput(e.target, true);
    });
  });
}

let activeSuggestInput = null;
let activeSuggestList = null;

function handleSuggestInput(input, forceOpen = false) {
  const k = input.dataset.k;
  const val = input.value.trim();
  const category = $("manualCategory").value;

  if (category === "idari") return; // idari birim: serbest metin, onerisiz

  let options = [];
  if (k === "fakulte_tr") {
    options = UNIVERSITY_DATA ? UNIVERSITY_DATA.map((f) => f.faculty) : [];
  } else if (k === "program_tr") {
    const facInput = $("manualFields").querySelector('[data-k="fakulte_tr"]');
    options = programsForFaculty(facInput ? facInput.value : "").map((p) => p.tr);
  } else if (k === "personel_unvan" && category === "akademik") {
    options = ["Arş. Gör.", "Öğr. Gör.", "Dr. Öğr. Üyesi", "Doç. Dr.", "Prof. Dr."];
  } else if (k === "fakulte_en") {
    options = UNIVERSITY_DATA ? UNIVERSITY_DATA.map((f) => f.facultyEn) : [];
  } else if (k === "program_en") {
    const facInput = $("manualFields").querySelector('[data-k="fakulte_tr"]');
    options = programsForFaculty(facInput ? facInput.value : "").map((p) => p.en);
  }

  if (!options.length) return;

  const list = document.getElementById(`sugg-${k}`);
  if (!list) return;

  activeSuggestInput = input;
  activeSuggestList = list;

  const filtered = forceOpen || !val
    ? options
    : options.filter((o) => o.toLowerCase().includes(val.toLowerCase()));

  list.innerHTML = filtered.slice(0, 8).map((o) => `<li class="suggest-item" data-val="${escapeHtml(o)}">${escapeHtml(o)}</li>`).join("");
  list.style.display = filtered.length ? "block" : "none";

  list.querySelectorAll(".suggest-item").forEach((li) => {
    li.addEventListener("click", () => {
      input.value = li.dataset.val;
      list.style.display = "none";
      autoFillPair(input, li.dataset.val);
      renderManualPreview();
    });
  });
}

/* Fakulte/Program secildiginde karsi dili otomatik doldur.
   Program secildiginde fakulte de bos ise programdan tamamlanir. */
function autoFillPair(input, picked) {
  if (!UNIVERSITY_DATA) return;
  const k = input.dataset.k;
  const fields = {};
  document.querySelectorAll("#manualFields input.mf").forEach((el) => { fields[el.dataset.k] = el; });

  if (k === "fakulte_tr" || k === "fakulte_en") {
    const fac = UNIVERSITY_DATA.find((f) => f.faculty === picked) || UNIVERSITY_DATA.find((f) => f.facultyEn === picked);
    if (!fac) return;
    if (fields.fakulte_tr) fields.fakulte_tr.value = fac.faculty;
    if (fields.fakulte_en) fields.fakulte_en.value = fac.facultyEn;
    return;
  }

  const facTr = fields.fakulte_tr?.value?.trim();
  const facEntry = UNIVERSITY_DATA.find((f) => f.faculty === facTr);
  const scope = facEntry ? facEntry.programs : UNIVERSITY_DATA.flatMap((f) => f.programs || []);
  const p = scope.find((p) => p.tr === picked) || scope.find((p) => p.en === picked);
  if (!p) return;

  if (fields.program_tr) fields.program_tr.value = p.tr;
  if (fields.program_en) fields.program_en.value = p.en;

  // Fakulte bos ise programın ait oldugu fakulteyi doldur
  if (!facTr) {
    const owner = UNIVERSITY_DATA.find((f) => (f.programs || []).some((pp) => pp.tr === p.tr));
    if (owner) {
      if (fields.fakulte_tr) fields.fakulte_tr.value = owner.faculty;
      if (fields.fakulte_en) fields.fakulte_en.value = owner.facultyEn;
    }
  } else if (facEntry && fields.fakulte_en && !fields.fakulte_en.value.trim()) {
    fields.fakulte_en.value = facEntry.facultyEn;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.addEventListener("click", (e) => {
  if (activeSuggestList && !activeSuggestList.contains(e.target) && e.target !== activeSuggestInput) {
    activeSuggestList.style.display = "none";
  }
});

/* Manuel alanlari kategori secimine gore yenile */
$("manualCategory")?.addEventListener("change", (e) => {
  renderManualFields(e.target.value);
  renderManualPreview();
});

function readManualData() {
  const d = {};
  document.querySelectorAll(".mf").forEach((inp) => { if (inp.value.trim()) d[inp.dataset.k] = inp.value.trim(); });
  return d;
}

function renderManualPreview() {
  const d = readManualData();
  if (!d.ad && !d.soyad) { $("manualPreview").classList.add("hidden"); $("manualPreviewEmpty").classList.remove("hidden"); return; }
  $("manualPreview").classList.remove("hidden");
  $("manualPreviewEmpty").classList.add("hidden");
  $("manualPreview").innerHTML = cardHtml(d, manualPhotoUrl, $("manualCategory").value);
  requestAnimationFrame(() => fitKartTexts($("manualPreview")));
}

$("manualPhoto").addEventListener("change", (e) => {
  manualPhotoFile = e.target.files[0] || null;
  if (manualPhotoFile) {
    $("manualPhotoName").textContent = manualPhotoFile.name;
    manualPhotoUrl = URL.createObjectURL(manualPhotoFile);
    renderManualPreview();
  }
});
let manualPhotoUrl = null;

$("manualPreviewBtn").addEventListener("click", renderManualPreview);

$("manualAddBtn").addEventListener("click", () => {
  const d = readManualData();
  if (!d.ad && !d.soyad) { alert("Ad veya Soyad giriniz"); return; }
  manualCards.push({ data: d, photo: manualPhotoUrl });
  renderManualList();
  document.querySelectorAll(".mf").forEach((inp) => (inp.value = ""));
  manualPhotoUrl = null; manualPhotoFile = null;
  $("manualPhotoName").textContent = "";
  $("manualPreviewEmpty").classList.remove("hidden");
  $("manualPreview").classList.add("hidden");
});

function renderManualList() {
  $("manualList").innerHTML = manualCards.map((c, i) => `
    <div class="list-row">
      <div><b>${c.data.ad || ""} ${c.data.soyad || ""}</b>
        <div class="meta">${c.data.ogrenci_no || c.data.personel_no || c.data.tc_no || ""}</div></div>
      <button class="btn small danger" onclick="removeManualCard(${i})">Sil</button>
    </div>
  `).join("");
  $("manualListCount").textContent = manualCards.length ? `(${manualCards.length} kart)` : "";
  $("manualSaveBatch").classList.toggle("hidden", manualCards.length === 0);
}

function removeManualCard(i) { manualCards.splice(i, 1); renderManualList(); }

$("manualSaveBatch").addEventListener("click", async () => {
  try {
    const data = await api("/api/batches", {
      method: "POST",
      body: JSON.stringify({
        category: $("manualCategory").value,
        source: "manual",
        rows: manualCards.map((c) => c.data),
        name: `${$("manualCategory").selectedOptions[0].text} - Manuel Giriş`,
      }),
    });
    manualCards = [];
    renderManualList();
    openBatch(data.batchId);
  } catch (err) { alert(err.message); }
});

/* ---------- Card HTML (Yüksek İhtisas şablon tabanlı) ---------- */
/* Referans: C:\Users\Aaa\Documents\Varsayılan Proje\kartlar.html
   Background image (PDF şablon) + absolut konumlandırılmış metin katmanları */

const UNI_LOGO = `<img src="assets/yiu-logo.png" alt="YİÜ" style="width:30px;height:29px;object-fit:contain" />`;
const UNI_LOGO_CIRCLE = `<span style="display:inline-grid;place-items:center;flex:0 0 26px;width:26px;height:26px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25)"><img src="assets/yiu-logo.png" alt="" style="width:20px;height:19px;object-fit:contain" /></span>`;

const TERMS_TR = [
  "Bu kartın mülkiyeti Yüksek İhtisas Üniversitesi'ne aittir.",
  "Bulunması / kaybedilmesi halinde (0312) 3291010 nolu telefona bilgi verilmesi veya Üniversitemize iletilmesi önemle rica olunur.",
  "Kartınızı güneşte bırakmayınız ve katlamayınız.",
  "Kartınızı manyetik ortamdan uzak tutunuz.",
  "Bu kart, Üniversite ile ilişiğin kesilmesi durumunda alınan birime iade edilecektir.",
];
const TERMS_EN = [
  "The property of this card belongs to Yuksek Ihtisas University.",
  "If the card is found, please call (0312) 3291010 or send the card to the university.",
  "Do not leave the card in the sun and do not bend it.",
  "Keep the card away from magnetic media.",
  "The card must be returned to the university in case of dismissal or graduation.",
];

function barcodeSvg(serial) {
  const s = String(serial);
  let x = 2;
  const bars = [];
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i);
    const w = (d % 3) + 1;
    bars.push(`<rect x="${x}" y="0" width="${w}" height="56"/>`);
    x += w + 1;
    bars.push(`<rect x="${x}" y="0" width="1" height="56" fill="#0b1220" opacity=".9"/>`);
    x += 2;
  }
  return `<svg viewBox="0 0 ${x} 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><g fill="#0b1220">${bars.join("")}</g></svg>`;
}
function serialOf(d) {
  if (d._serial) return String(d._serial).padStart(6, "0");
  if (d._idx != null) return String(d._idx + 1).padStart(6, "0");
  const n = (d.tc_no || d.ogrenci_no || d.personel_no || "0").split("").reduce((a, c) => (a * 31 + (+c || 7) + 13) % 1000000, 7);
  return String(Math.abs(n)).padStart(6, "0");
}
function academicYear() {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}
function shortDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}

/* SQLite datetime('now') UTC olarak kaydeder. UI’da Türkiye saati (UTC+3) göster. */
function trDateTime(iso, withSeconds = false) {
  if (!iso) return "—";
  const d = new Date(String(iso).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  d.setUTCHours(d.getUTCHours() + 3);
  const p = (n) => String(n).padStart(2, "0");
  const ymd = `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  const hm = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  return withSeconds ? `${ymd} ${hm}:${p(d.getUTCSeconds())}` : `${ymd} ${hm}`;
}
function buildTimestamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}_${String(date.getMilliseconds()).padStart(3, "0")}`;
}

const CARD_CATS = {
  ogrenci: { strip: "ÖĞRENCİ", stripEn: "STUDENT", back: "ÖĞRENCİ", backEn: "STUDENT", band: null },
  stajer:  { strip: "STAJER",  stripEn: "INTERN",  back: "STAJYER DOKTOR", backEn: "INTERN DOCTOR" },
  akademik:{ strip: "AKADEMİK", stripEn: "ACADEMIC", back: "AKADEMİK PERSONEL", backEn: "ACADEMIC STAFF" },
  idari:   { strip: "İDARİ",   stripEn: "ADMIN",   back: "İDARİ PERSONEL", backEn: "ADMINISTRATIVE STAFF" },
  intorn:  { strip: "İNTÖRN",  stripEn: "INTERN",  back: "İNTÖRN", backEn: "INTERN" },
};

/* Background images — split front/back (1990x1146, aspect ~1.736) */
const CARD_BG = {
  akademik:  { front: API + "/assets/card_tpl/akademik-front.jpg",  back: API + "/assets/card_tpl/akademik-back.jpg" },
  idari:     { front: API + "/assets/card_tpl/idari-front.jpg",     back: API + "/assets/card_tpl/idari-back.jpg" },
  ogrenci:   { front: API + "/assets/card_tpl/ogrenci-front.jpg",   back: API + "/assets/card_tpl/ogrenci-back.jpg" },
  intorn:    { front: API + "/assets/card_tpl/intern-front.jpg",    back: API + "/assets/card_tpl/intern-back.jpg" },
  stajer:    { front: API + "/assets/card_tpl/stajyer-front.jpg",   back: API + "/assets/card_tpl/stajyer-back.jpg" },
};

/* Kart en-boy oranları (PDF img bbox'larından: ogrenci/akademik/idari 283.5/164.4, intorn/stajyer 290.5/164.4) */
const CARD_RATIO = {
  akademik: "1990 / 1146",
  idari: "1990 / 1146",
  ogrenci: "1990 / 1146",
  intorn: "2039 / 1146",
  stajer: "2039 / 1146",
};

/* Referanstaki field pozisyonları — KartSablonlari-On-Arka spec.json'dan (yüzde + cqw).
   Her kartta front/back ayrı. */
const CARD_FIELDS = {
  akademik: {
    front: [
      { k: "ad",      l: 15.64, t: 50.5, w: 44.55, f: 3.17 },
      { k: "unvan",   l: 15.64, t: 62,   w: 44.55, f: 3.17 },
      { k: "anabilim",l: 15.64, t: 76,   w: 44.55, f: 3.17 },
      { k: "sicil",   l: 15.64, t: 88.2, w: 44.55, f: 3.96 },
      { k: "okul",    l: 29.7,  t: 25,   w: 57.43, f: 2.87, al: "center" },
      { k: "bolum",   l: 29.7,  t: 33.5, w: 57.43, f: 2.87, al: "center" },
      { k: "seri",    l: 95.25, t: 0.6,  f: 2.77, rot: 1 },
    ],
    back: [
      { k: "barkodno",l: -2.38, t: 53,   f: 2.77, rot: 1 },
      { k: "tarih",   l: 87.72, t: 71.8, f: 1.09, rot: 1, wt: 400 },
    ],
  },
  idari: {
    front: [
      { k: "ad",      l: 17.03, t: 57.7, w: 44.55, f: 3.17 },
      { k: "gorev",   l: 17.03, t: 71.9, w: 47.52, f: 2.87 },
      { k: "sicil",   l: 17.03, t: 87.4, w: 44.55, f: 3.17 },
      { k: "birim",   l: 29.7,  t: 25,   w: 57.43, f: 3.76, al: "center" },
      { k: "seri",    l: 95.84, t: 2.8,  f: 2.77, rot: 1 },
    ],
    back: [
      { k: "barkodno",l: -2.38, t: 44.5, f: 2.77, rot: 1 },
      { k: "tarih",   l: 88.51, t: 72.2, f: 1.09, rot: 1, wt: 400 },
    ],
  },
  ogrenci: {
    front: [
      { k: "ad",      l: 39.01, t: 42,   w: 59.41, f: 3.47 },
      { k: "no",      l: 39.01, t: 55.2, w: 59.41, f: 3.88 },
      { k: "faktr",   l: 39.01, t: 64.7, w: 59.41, f: 2.44 },
      { k: "faken",   l: 39.41, t: 70.4, w: 59.41, f: 2.42 },
      { k: "progtr",  l: 39.01, t: 77.8, w: 59.41, f: 2.44 },
      { k: "progen",  l: 39.01, t: 83.8, w: 59.41, f: 2.42 },
      { k: "seri",    l: 94.26, t: 2.4,  f: 2.77, rot: 1 },
    ],
    back: [
      { k: "tarih",   l: 14.65, t: 18.5, w: 39.6,  f: 1.78, wt: 400 },
      { k: "sn",      l: 13.66, t: 88.5, w: 19.8,  f: 1.78, wt: 400 },
      { k: "barkodno",l: 5.94,  t: 82,   w: 23.76, f: 1.78, wt: 400 },
    ],
  },
  intorn: {
    front: [
      { k: "ad",        l: 39.6,  t: 59.2, w: 49.5,  f: 3.4 },
      { k: "fakulte",   l: 37.62, t: 50.5, w: 53.47, f: 2.77, al: "center", c: "#c40000", cov: "#f6f6f6", h: 7 },
      { k: "ogrno",     l: 41.58, t: 74.4, w: 31.68, f: 2.39 },
      { k: "gecerlilik",l: 66.73, t: 74,   w: 31.68, f: 2.39 },
      { k: "seri",      l: 94.46, t: 2.4,  f: 3.43, rot: 1 },
    ],
    back: [
      { k: "fakulte2",  l: 27.72, t: 48,   w: 54.46, f: 2.77, al: "center", c: "#c40000", cov: "#ffffff", h: 6 },
      { k: "barkodno",  l: 34.88, t: 76.4, w: 31.68, f: 2.08, al: "center", wt: 400 },
      { k: "tarih",     l: 87.72, t: 11.7, f: 1.08, rot: 1, wt: 400 },
    ],
  },
  stajer: {
    front: [
      { k: "ad",        l: 39.6,  t: 59.1, w: 49.5,  f: 3.03 },
      { k: "fakulte",   l: 37.62, t: 50.5, w: 53.47, f: 2.77, al: "center", c: "#c40000", cov: "#f6f6f6", h: 7 },
      { k: "ogrno",     l: 40.99, t: 74.4, w: 31.68, f: 2.38 },
      { k: "gecerlilik",l: 66.14, t: 74,   w: 31.68, f: 2.38 },
      { k: "seri",      l: 94.26, t: 2.5,  f: 3.37, rot: 1 },
    ],
    back: [
      { k: "fakulte2",  l: 27.72, t: 52,   w: 54.46, f: 2.77, al: "center", c: "#c40000", cov: "#ffffff", h: 6 },
      { k: "barkodno",  l: 38.61, t: 76.4, w: 31.68, f: 2.08, al: "center", wt: 400 },
      { k: "tarih",     l: 87.72, t: 13.5, f: 1.09, rot: 1, wt: 400 },
    ],
  },
};

/* Fotoğraf ve barkod pozisyonları — spec.json front_foto / back_bar */
const CARD_PHOTO = {
  akademik:  { l: 64.36, t: 44,   w: 22.18, h: 47 },
  idari:     { l: 63.17, t: 41.2, w: 21.78, h: 51.3 },
  ogrenci:   { l: 16.83, t: 40.8, w: 20.79, h: 49.8 },
  intorn:    { l: 11.88, t: 14,   w: 23.37, h: 55.3 },
  stajer:    { l: 11.09, t: 15.4, w: 24.16, h: 55.2 },
};
const CARD_BARCODE = {
  akademik:  { l: 7.72,  t: 28, w: 16.44, h: 60 },
  idari:     { l: 7.72,  t: 28, w: 16.44, h: 60 },
  ogrenci:   { l: 5.94,  t: 25, w: 13.86, h: 55 },
  intorn:    { l: 30.3,  t: 62, w: 49.5,  h: 14 },
  stajer:    { l: 30.69, t: 62, w: 47.52, h: 14 },
};

/* Mevcut proje verilerini şablon alanlarına eşle */
function mapCardData(d, category) {
  const ad = esc(((d.ad || "") + " " + (d.soyad || "")).toLocaleUpperCase("tr-TR")).trim();
  const serial = serialOf(d);
  const barcodeNo = d.tc_no || d.ogrenci_no || d.personel_no || serial;
  const now = new Date();
  const gecerlilik = `${now.getDate().toString().padStart(2, "0")}.${(now.getMonth() + 1).toString().padStart(2, "0")}.${(now.getFullYear() + 1).toString().slice(-2)}`;

  const m = {
    ad,
    no: d.ogrenci_no || d.personel_no || d.tc_no || "",
    faktr: d.fakulte_tr || "",
    faken: d.fakulte_en || "",
    progtr: d.program_tr || "",
    progen: d.program_en || "",
    fakulte: [d.fakulte_tr || "", d.program_tr || ""].filter(Boolean).join(" ") || d.fakulte_tr || "",
    fakulte2: [d.fakulte_en || "", d.program_en || ""].filter(Boolean).join(" ") || d.fakulte_tr || "",
    unvan: d.personel_unvan || "",
    gorev: d.personel_unvan || "",
    sicil: d.personel_no || d.ogrenci_no || d.tc_no || "",
    anabilim: d.program_tr || "",
    birim: d.unite_tr || "",
    ogrno: d.ogrenci_no || d.personel_no || d.tc_no || "",
    gecerlilik,
    seri: serial,
    barkodno: barcodeNo,
    tarih: shortDate(),
    tarihwrap: `${academicYear()}  ${shortDate()}`,
    sn: "<<sn>>",
    okul: "YÜKSEK İHTİSAS ÜNİVERSİTESİ",
    bolum: d.fakulte_tr || "",
  };
  return m;
}

/* Tek bir metin katmanı HTML'i — referans .ov/.ovr bire bir */
function textLayer(f, val) {
  const style = [];
  style.push(`left:${f.l}%`);
  style.push(`top:${f.t}%`);
  if (f.w) style.push(`width:calc(${f.w}% - 3px)`);
  if (f.h) style.push(`height:${f.h}%`);
  style.push(`font-size:${f.f || 1}cqw`);
  // PDF: TR satırları kalın (F1 Bold), EN satırları normal (F3 Regular) — bire bir
  const wt = f.wt ?? ((f.k === "faken" || f.k === "progen" || f.k === "fakulte2") ? 400 : 700);
  style.push(`font-weight:${wt}`);
  if (f.c) style.push(`color:${f.c}`);
  if (f.al) style.push(`text-align:${f.al}`);
  if (f.wr) style.push(`white-space:${f.wr}`);
  if (f.rot) style.push("transform:rotate(90deg);transform-origin:left top;");
  if (f.cov) style.push(`background:${f.cov};padding:0 4px;display:flex;align-items:center;justify-content:center;`);

  return `<div class="kart-text${f.rot ? ' rot' : ''}${f.cov ? ' cov' : ''}" data-fit="1" style="${style.join(';')}">${esc(val || "")}</div>`;
}

/* Kart metinlerini kutuya sığdır: taşan yazıyı %2'lik adımlarla küçült */
function fitKartTexts(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll(".kart-text[data-fit]").forEach((el) => {
    if (!el.textContent?.trim()) return;
    let size = parseFloat(getComputedStyle(el).fontSize) || 8;
    const base = size;
    let guard = 0;
    while (guard++ < 40 && el.scrollWidth > el.clientWidth + 2 && size > 3) {
      size *= 0.97;
      el.style.fontSize = size + "px";
      // clientWidth/offsetWidth cqw container ile yeniden ölç
      if (el.scrollWidth <= el.clientWidth + 2) break;
      if (el.offsetWidth === 0) break;
    }
    if (size >= base - 0.1) el.style.fontSize = base + "px"; // sığdı, orijinal boyutu px olarak koru
  });
}

function renderSheet(side, category, d, photoUrl, m) {
  const bg = (CARD_BG[category] || {})[side] || "";
  const fields = ((CARD_FIELDS[category] || {}).front || []).concat(((CARD_FIELDS[category] || {}).back || []).slice(0,0));
  // side'a göre alan seç
  const sideFields = (CARD_FIELDS[category] || {})[side] || [];
  const layers = sideFields.map(f => textLayer(f, m[f.k] || "")).join("");
  const ph = CARD_PHOTO[category];
  const bc = CARD_BARCODE[category];
  const hasPhotoSlot = side === "front" && !!ph;
  const hasBarcodeSlot = side === "back" && !!bc;

  const photoHtml = hasPhotoSlot ? (photoUrl
    ? `<img class="kart-photo-tpl" src="${photoUrl}" alt="" style="left:${ph.l}%;top:${ph.t}%;width:${ph.w}%;height:${ph.h}%" />`
    : `<div class="kart-photo-tpl ghost" style="left:${ph.l}%;top:${ph.t}%;width:${ph.w}%;height:${ph.h}%;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:10px;font-weight:700;">FOTO<br>YOK</div>`) : "";

  const barcodeVal = m.barkodno || m.seri;
  const barcodeHtml = hasBarcodeSlot ? `<div class="kart-barcode-tpl" style="left:${bc.l}%;top:${bc.t}%;width:${bc.w}%;height:${bc.h}%">${barcodeHtmlInner(barcodeVal)}</div>` : "";

  return `
    <div class="kart-template bg-${category}-${side}" style="aspect-ratio:${CARD_RATIO[category] || "283.5 / 164.4"}">
      ${bg ? `<img class="bg" src="${bg}" alt="" />` : ''}
      ${layers}
      ${photoHtml}
      ${barcodeHtml}
    </div>`;
}

function barcodeHtmlInner(val) {
  const s = String(val || "5").replace(/\D/g, ""); if (!s) return "";
  let bars = [];
  let x = 2;
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i);
    const w = (d % 3) + 1;
    bars.push(`<rect x="${x}" y="0" width="${w}" height="56"/>`);
    x += w + 1;
    bars.push(`<rect x="${x}" y="0" width="1" height="56" fill="#0b1220" opacity=".9"/>`);
    x += 2;
  }
  return `<svg viewBox="0 0 ${x} 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;"><rect width="100%" height="100%" fill="#ffffff"/><g fill="#0b1220">${bars.join("")}</g></svg>`;
}

function frontTpl(d, photoUrl, category) {
  return renderSheet("front", category, d, photoUrl, mapCardData(d, category));
}
function backTpl(d, photoUrl, category) {
  return renderSheet("back", category, d, photoUrl, mapCardData(d, category));
}

function cardHtml(d, photoUrl, category) {
  const front = frontTpl(d, photoUrl, category);
  const back = backTpl(d, photoUrl, category);
  return `<div class="kart-shell"><div class="kart-pair">${front}${back}</div></div>`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ---------- Kart Basım (tarih gruplı liste) ---------- */
function dateKeyOf(iso) {
  // created_at: "2026-11-05 12:54:18" (UTC)
  const d = new Date(String(iso).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "tarih-yok";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dateLabelOf(iso) {
  const d = new Date(String(iso).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", weekday: "long" });
}
function dayCatLabel() {
  return "";
}

async function loadKartBasim() {
  const roleFilter = $("kbRoleFilter")?.value || "";
  const allBatches = await api("/api/batches");
  const batches = roleFilter
    ? allBatches.filter((b) => b.created_by_role === roleFilter)
    : allBatches;
  const groups = new Map();
  for (const b of batches) {
    const k = dateKeyOf(b.created_at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  const sortedKeys = [...groups.keys()].sort().reverse();
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

  $("kbDateGroups").innerHTML = sortedKeys.map((k, idx) => {
    const items = groups.get(k).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const first = items[0];
    const totalCards = items.reduce((s, b) => s + (b.card_count || 0), 0);
    const totalMatched = items.reduce((s, b) => s + (b.matched_count ?? 0), 0);
    const dateLabel = dateLabelOf(first.created_at);
    const open = idx === 0 ? "open" : "";
    return `
    <div class="date-group ${open}" data-date="${k}">
      <button class="date-header" type="button">
        <svg class="chev" width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M7 5l6 5-6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="d">${dateLabel}</span>
        <span class="badge ${items.some((b) => b.status === "pending") ? "pending" : (items.some((b) => b.status === "printed") ? "printed" : "draft")}">${items.length} işlem</span>
        <span class="n">${totalCards} kart · <span class="match-ok">${totalMatched} fotoğraf</span></span>
      </button>
      <div class="date-body">
        ${items.map((b) => `
          <div class="date-item" role="button" tabindex="0" onclick="openBatch(${b.id})" onkeydown="if(event.key==='Enter')openBatch(${b.id})">
            <span class="text-xl">🪪</span>
            <div class="grow">
              <div class="t">${esc(b.name)} <span class="badge ${badgeClass(b)}" style="margin-left:4px">${statusLabel(b)}</span></div>
              <div class="meta2">${catLabel[b.category] || b.category} · ${b.card_count} kart · <span class="${(b.matched_count ?? 0) === b.card_count ? "match-ok" : "match-warn"}">${b.matched_count ?? 0}/${b.card_count} fotoğraf eşleşti</span>${(b.missing_field_count || 0) > 0 ? ` · <span class="match-warn">${b.missing_field_count} eksik alan</span>` : ""} · ${b.source === "manual" ? "Manuel" : "Excel"} · ${trDateTime(b.created_at)}${b.created_by_role ? ` · <span class="font-semibold text-slate-500">${esc(ROLE_BADGE[b.created_by_role] || b.created_by_role)}</span>` : ""}${b.mail_sent_at ? " · 📧" : ""}</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button class="btn small danger" onclick="event.stopPropagation(); deleteBatch(${b.id})">Sil</button>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" class="text-slate-400"><path d="M7 5l6 5-6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
  }).join("") || `<p class="py-8 text-center text-sm text-slate-400">Henüz kart işlemi yok — <b>Toplu Ekle</b> ile bir liste yükleyin.</p>`;

  // Accordion toggle
  document.querySelectorAll("#kbDateGroups .date-header").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".date-group").classList.toggle("open"));
  });
}

async function deleteBatch(id) {
  if (!confirm("Bu işlem ve tüm kartları silinsin mi?")) return;
  await api(`/api/batches/${id}`, { method: "DELETE" });
  loadKartBasim();
  if ($("view-batchDetail") && !$("view-batchDetail").classList.contains("hidden")) showView("kartBasim");
}

let currentDetail = null;
let detailFilter = "all";

/* ---------- Batch detail ---------- */
window.openBatch = async function (id) {
  const b = await api(`/api/batches/${id}`);
  currentBatch = b;
  currentDetail = b;
  detailFilter = "all";
  showView("batchDetail");
  document.querySelectorAll(".nav-item").forEach((x) => x.classList.toggle("active", x.dataset.view === "kartBasim"));

  const matched = b.cards.filter((c) => c.photo_url).length;
  const missing = b.cards.length - matched;
  $("batchTitle").textContent = `${b.name}`;
  $("batchSubtitle").textContent = `${b.cards.length} kart · ${b.source === "manual" ? "Manuel giriş" : "Excel"} · Durum: ${statusLabel(b)}`;
  $("batchActions").innerHTML = `
    <button class="btn primary" onclick="downloadPdf(${b.id})">⬇ Toplu PDF İndir</button>
    <span class="badge ${badgeClass(b)}">${statusLabel(b)}</span>
  `;
  $("countAll").textContent = b.cards.length;
  $("countMatched").textContent = matched;
  $("countMissing").textContent = missing;
  $("matchSummary").className = `badge ${missing === 0 ? "printed" : "pending"}`;
  $("matchSummary").textContent = `${matched}/${b.cards.length} eşleşti`;
  $("missingHint").textContent = missing === 0
    ? "✓ Tüm kartların fotoğrafı eşleşti"
    : `⚠ ${missing} kartın fotoğrafı bulunamadı (dosya adı = numara olmalı)`;
  document.querySelectorAll("#matchChips .chip").forEach((chip) => chip.classList.toggle("chip-active", chip.dataset.filter === "all"));
  renderDataReport(b.data_report, b);
  renderDetailCards();
};

/* ---------- Eksik alan raporu ---------- */
function renderDataReport(report, batch) {
  const el = $("dataReport");
  if (!el) return;
  if (!report) { el.innerHTML = ""; return; }

  if (report.complete) {
    el.innerHTML = `
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Eksik alan raporu</span>
        <span class="badge printed">✓ Tam</span>
        <p class="text-xs text-slate-500">Tüm kartlarda fakülte/bölüm alanları dolu.</p>
      </div>`;
    return;
  }

  const chips = report.fields
    .map((f) => `<span class="chip chip-missing" style="cursor:default">${esc(f.label)} <span>${f.count}</span></span>`)
    .join("");

  const items = report.items.map((it) => {
    const name = `${it.ad || ""} ${it.soyad || ""}`.trim() || "İsimsiz";
    const labels = it.missing
      .map((m) => `<span class="text-[9px] font-semibold text-amber-800 bg-white border border-amber-300 rounded px-1.5 py-0.5">${esc(m.label)}</span>`)
      .join("");
    return `
      <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
        <div class="min-w-0 grow">
          <div class="text-xs font-bold text-slate-800 truncate">${esc(name)}</div>
          <div class="text-[10px] text-slate-500 font-mono">${esc(it.no || "—")}</div>
        </div>
        <div class="flex flex-wrap gap-1 justify-end shrink-0" style="max-width:60%">${labels}</div>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="flex items-center gap-3 flex-wrap mb-3">
      <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Eksik alan raporu</span>
      <span class="badge pending">${report.affected}/${report.total} kartta eksik</span>
      <div class="flex items-center gap-1.5 flex-wrap">${chips}</div>
      <button class="btn small sm:ml-auto" onclick="downloadMissingReport(${batch.id})">⬇ Eksikleri Excel İndir</button>
    </div>
    <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">${items}</div>
    <p class="mt-2 text-[11px] text-slate-400">Otomatik eşleştirme sonrası hâlâ boş kalan alanlar listelenir. Excel'i düzeltip yeniden yükleyebilirsiniz.</p>`;
}

function renderDetailCards() {
  const b = currentDetail;
  const cards = b.cards.filter((c) => {
    if (detailFilter === "matched") return !!c.photo_url;
    if (detailFilter === "missing") return !c.photo_url;
    return true;
  });
  $("cardGrid").innerHTML = cards.map((c) => {
    const d = { ...c.data, _idx: c.id };
    const photo = c.photo_url ? `${API}${c.photo_url}${c.photo_url.includes("?") ? "&" : "?"}token=${encodeURIComponent(SESSION)}` : null;
    const photoBadge = c.photo_url
      ? `<span class="badge printed">Fotoğraf ✓</span>`
      : `<span class="badge pending">Fotoğraf eksik</span>`;
    return `
      <div class="rounded-2xl border ${c.photo_url ? "border-slate-200" : "border-amber-300 bg-amber-50/40"} bg-slate-50/60 p-3">
        <div class="flex items-center gap-2 mb-2 pl-1">
          <span class="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md px-2 py-0.5">#${String(c.id).padStart(4, "0")}</span>
          <span class="text-sm font-bold text-slate-700 truncate">${esc((c.data.ad || "") + " " + (c.data.soyad || ""))}</span>
          ${photoBadge}
          <span class="badge ${c.status}" style="margin-left:auto">${c.status === "printed" ? "Basıma Gönderildi" : "Bekliyor"}</span>
        </div>
        ${cardHtml(d, photo, b.category)}
        <div class="kart-actions">
          <button class="btn small" onclick="downloadCardPdf(${b.id},${c.id})">⬇ Tek Kart PDF</button>
          <button class="btn small danger" onclick="deleteCard(${b.id},${c.id})">Sil</button>
        </div>
      </div>`;
  }).join("") || `<p class="py-8 text-center text-sm text-slate-400">${detailFilter === "missing" ? "✓ Eksik fotoğrafı olan kart yok" : "Bu filtrede kart yok."}</p>`;
  requestAnimationFrame(() => fitKartTexts($("cardGrid")));
}

// Chip filtreleri
document.querySelectorAll("#matchChips .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (!currentDetail) return;
    detailFilter = chip.dataset.filter;
    document.querySelectorAll("#matchChips .chip").forEach((c) => c.classList.toggle("chip-active", c === chip));
    renderDetailCards();
  });
});

function row(l, v) { return v ? `<div class="fld"><b>${l}</b>${esc(v)}</div>` : ""; }

window.downloadPdf = function (id) {
  fetch(`${API}/api/batches/${id}/pdf`, { headers: { "x-session": SESSION } })
    .then((r) => { if (!r.ok) throw new Error("PDF yok"); return r.blob(); })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `otokart_${id}.pdf`;
      a.click();
    })
    .catch((e) => alert(e.message));
};

window.downloadMissingReport = async function (id) {
  const res = await fetch(`${API}/api/batches/${id}/missing.xlsx`, { headers: { "x-session": SESSION } });
  if (!res.ok) { alert("Rapor oluşturulamadı"); return; }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `eksik_alanlar_${id}.xlsx`;
  a.click();
};

window.downloadCardPdf = async function (batchId, cardId) {
  const res = await fetch(`${API}/api/batches/${batchId}/cards/${cardId}/pdf`, { headers: { "x-session": SESSION } });
  if (!res.ok) { alert("PDF oluşturulamadı"); return; }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kart_${cardId}.pdf`;
  a.click();
};

window.deleteCard = async function (batchId, cardId) {
  if (!confirm("Kart silinsin mi?")) return;
  await api(`/api/batches/${batchId}/cards/${cardId}`, { method: "DELETE" });
  openBatch(batchId);
};

$("backToBatches").addEventListener("click", () => showView("kartBasim"));

/* ---------- Mail merkezi ---------- */
let mailState = { batches: [], selected: new Set(), settings: {} };

function switchMailMode(mode) {
  document.querySelectorAll(".mail-mode").forEach((b) => {
    b.classList.toggle("active", b.dataset.mailMode === mode);
  });
  const ids = { instant: "mailInstant", daily: "mailDaily", weekly: "mailWeekly" };
  for (const [key, id] of Object.entries(ids)) {
    $(id)?.classList.toggle("hidden", key !== mode);
  }
}

async function loadMail() {
  if (!canUseMail()) return;
  const settings = await api("/api/settings");
  mailState.settings = settings;

  const defaultTo = settings.mail_to_default || "";
  $("mailInstantTo").value = defaultTo;
  $("mailInstantSubject").value = settings.mail_subject_template || "";
  $("mailInstantBody").value = settings.mail_body_template || "";
  $("mailDailyTo").value = defaultTo;
  $("mailDailySubject").value = settings.mail_subject_template || "";
  $("mailDailyBody").value = settings.mail_body_template || "";
  $("mailDailyTime").value = settings.mail_daily_time || "18:00";
  $("mailWeeklyTo").value = defaultTo;
  $("mailWeeklySubject").value = settings.mail_subject_template || "";
  $("mailWeeklyBody").value = settings.mail_body_template || "";
  $("mailWeeklyTime").value = settings.mail_weekly_time || "09:00";
  if (settings.mail_weekly_day !== undefined) $("mailWeeklyDay").value = String(settings.mail_weekly_day);

  const smtpCard = $("mailSmtpCard");
  if (smtpCard) smtpCard.classList.toggle("hidden", !isAdmin());
  if (isAdmin()) {
    $("mailSmtpHost").value = settings.mail_smtp_host || "smtp.gmail.com";
    $("mailSmtpPort").value = settings.mail_smtp_port || "587";
    $("mailSmtpSecure").value = String(settings.mail_smtp_secure || "false");
    $("mailFromName").value = settings.mail_from_name || "OtoKart";
    $("mailSmtpUser").value = settings.mail_smtp_user || "";
    $("mailSmtpPass").value = settings.mail_smtp_pass || "";
    $("mailToDefault").value = defaultTo;
  }

  mailState.batches = await api("/api/batches");
  mailState.selected.clear();
  renderMailBatches();
  await loadMailJobs();
  await loadMailLogs();
}

function renderMailBatches() {
  const cat = $("mailInstantCategory")?.value || "";
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  const list = mailState.batches.filter((b) => !cat || b.category === cat);

  $("mailBatchList").innerHTML = list.map((b) => `
    <label class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
      <input type="checkbox" class="mail-batch-cb h-4 w-4 rounded border-slate-300 text-brandred focus:ring-brandred" data-batch-id="${b.id}" ${mailState.selected.has(b.id) ? "checked" : ""} />
      <div class="min-w-0 grow">
        <div class="text-sm font-semibold text-slate-800 truncate">${esc(b.name)}</div>
        <div class="text-[11px] text-slate-500">${catLabel[b.category] || b.category} · ${b.card_count} kart · ${trDateTime(b.created_at)}${b.mail_sent_at ? " · 📧 gönderildi" : ""}</div>
      </div>
      <span class="badge ${badgeClass(b)}">${statusLabel(b)}</span>
    </label>
  `).join("") || `<p class="p-4 text-center text-sm text-slate-400">Bu filtrede liste yok.</p>`;

  document.querySelectorAll(".mail-batch-cb").forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = parseInt(cb.dataset.batchId, 10);
      if (cb.checked) mailState.selected.add(id);
      else mailState.selected.delete(id);
      $("mailSelectedCount").textContent = `${mailState.selected.size} seçili`;
    });
  });
  $("mailSelectedCount").textContent = `${mailState.selected.size} seçili`;
}

async function sendInstantMail() {
  const btn = $("mailInstantSend");
  const status = $("mailInstantStatus");
  const toEmail = $("mailInstantTo").value.trim();
  const batchIds = [...mailState.selected];

  if (!toEmail) { status.className = "text-xs text-red-700"; status.textContent = "Alıcı e-posta zorunlu"; return; }
  if (!batchIds.length) { status.className = "text-xs text-red-700"; status.textContent = "En az bir liste seçin"; return; }

  btn.disabled = true;
  btn.textContent = "Gönderiliyor…";
  status.className = "text-xs text-slate-500";
  status.textContent = "";
  try {
    const r = await api("/api/mail/send", {
      method: "POST",
      body: JSON.stringify({
        batchIds,
        toEmail,
        subject: $("mailInstantSubject").value,
        body: $("mailInstantBody").value,
      }),
    });
    status.className = "text-xs text-emerald-700";
    status.textContent = r.message || "Gönderildi.";
    mailState.selected.clear();
    await loadMail();
  } catch (err) {
    status.className = "text-xs text-red-700";
    status.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "📤 Şimdi Gönder";
  }
}

async function saveMailJob(mode) {
  const prefix = mode === "daily" ? "mailDaily" : "mailWeekly";
  const status = $(`${prefix}Status`);
  const payload = {
    name: $(`${prefix}Name`).value.trim(),
    mode,
    category: $(`${prefix}Category`).value || null,
    to_email: $(`${prefix}To`).value.trim(),
    subject: $(`${prefix}Subject`).value,
    body: $(`${prefix}Body`).value,
    send_time: $(`${prefix}Time`).value || (mode === "daily" ? "18:00" : "09:00"),
    weekday: mode === "weekly" ? parseInt($("mailWeeklyDay").value, 10) : null,
    active: $(`${prefix}Active`).checked,
  };
  if (!payload.name || !payload.to_email) {
    status.className = "text-xs text-red-700";
    status.textContent = "Kural adı ve alıcı e-posta zorunlu";
    return;
  }
  try {
    await api("/api/mail/jobs", { method: "POST", body: JSON.stringify(payload) });
    status.className = "text-xs text-emerald-700";
    status.textContent = "Kural kaydedildi ?";
    setTimeout(() => (status.textContent = ""), 2500);
    await loadMailJobs();
  } catch (err) {
    status.className = "text-xs text-red-700";
    status.textContent = err.message;
  }
}

async function loadMailJobs() {
  const rows = await api("/api/mail/jobs");
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  const modeLabel = { daily: "Gün Sonu", weekly: "Haftada Bir", instant: "Anında" };
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  $("mailJobList").innerHTML = rows.map((j) => {
    const when = j.mode === "weekly"
      ? `${days[j.weekday] || j.weekday} ${j.send_time}`
      : `Her gün ${j.send_time}`;
    return `
      <div class="list-row">
        <div class="min-w-0">
          <div><b>${esc(j.name)}</b>
            <span class="badge ${j.active ? "printed" : "draft"}" style="margin-left:4px">${j.active ? "Aktif" : "Pasif"}</span>
            <span class="badge draft" style="margin-left:4px">${modeLabel[j.mode] || j.mode}</span>
          </div>
          <div class="meta">${when} · ${j.category ? (catLabel[j.category] || j.category) : "Tüm kategoriler"} · ${esc(j.to_email)} · Son: ${j.last_run || "—"}${j.last_status ? ` · ${esc(j.last_status)}` : ""}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="btn small" onclick="runMailJob(${j.id})">▶ Şimdi Çalıştır</button>
          <button class="btn small danger" onclick="deleteMailJob(${j.id})">Sil</button>
        </div>
      </div>`;
  }).join("") || `<p class="hint">Henüz zamanlanmış mail kuralı yok.</p>`;
}

window.runMailJob = async function (id) {
  try {
    const r = await api(`/api/mail/jobs/${id}/run`, { method: "POST" });
    alert(r.skipped ? "Gönderilecek yeni liste yok." : (r.message || "Gönderildi."));
    await loadMailJobs();
    await loadMailLogs();
  } catch (err) {
    alert(err.message);
  }
};

window.deleteMailJob = async function (id) {
  if (!confirm("Bu mail kuralı silinsin mi?")) return;
  await api(`/api/mail/jobs/${id}`, { method: "DELETE" });
  await loadMailJobs();
};

async function loadMailLogs() {
  const rows = await api("/api/mail/logs");
  const modeLabel = { daily: "Gün Sonu", weekly: "Haftada Bir", instant: "Anında" };
  $("mailLogList").innerHTML = rows.map((l) => {
    let count = 0;
    try { count = JSON.parse(l.batch_ids || "[]").length; } catch {}
    const ok = l.status === "sent";
    return `
      <div class="flex items-center gap-3 py-2 px-1 border-b border-slate-100 last:border-0">
        <span class="badge ${ok ? "printed" : "draft"}">${ok ? "Gönderildi" : "Hata"}</span>
        <div class="min-w-0 grow">
          <div class="text-xs font-semibold text-slate-800">${esc(l.to_email || "—")} <span class="text-slate-400 font-normal">· ${modeLabel[l.mode] || l.mode || "—"}</span></div>
          <div class="text-[11px] text-slate-500">${count} liste · ${l.sent_at}${l.error ? ` · ${esc(l.error)}` : ""}</div>
        </div>
      </div>`;
  }).join("") || `<p class="hint">Henüz gönderim yok.</p>`;
}

async function saveSmtpSettings() {
  const status = $("mailSmtpStatus");
  try {
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        mail_smtp_host: $("mailSmtpHost").value,
        mail_smtp_port: $("mailSmtpPort").value,
        mail_smtp_secure: $("mailSmtpSecure").value,
        mail_smtp_user: $("mailSmtpUser").value,
        mail_smtp_pass: $("mailSmtpPass").value,
        mail_from_name: $("mailFromName").value,
        mail_to_default: $("mailToDefault").value,
      }),
    });
    status.className = "text-xs text-emerald-700";
    status.textContent = "Kaydedildi ?";
    setTimeout(() => (status.textContent = ""), 2500);
  } catch (err) {
    status.className = "text-xs text-red-700";
    status.textContent = err.message;
  }
}

async function testSmtp() {
  const status = $("mailSmtpStatus");
  const toEmail = $("mailToDefault").value || $("mailSmtpUser").value;
  if (!toEmail) { status.className = "text-xs text-red-700"; status.textContent = "Test için alıcı e-posta girin"; return; }
  status.className = "text-xs text-slate-500";
  status.textContent = "Test maili gönderiliyor…";
  try {
    await api("/api/mail/test", { method: "POST", body: JSON.stringify({ toEmail }) });
    status.className = "text-xs text-emerald-700";
    status.textContent = "Test maili gönderildi ?";
  } catch (err) {
    status.className = "text-xs text-red-700";
    status.textContent = err.message;
  }
}

/* Mail olaylari */
document.querySelectorAll(".mail-mode").forEach((b) => {
  b.addEventListener("click", () => switchMailMode(b.dataset.mailMode));
});
$("mailInstantCategory")?.addEventListener("change", renderMailBatches);
$("mailInstantSend")?.addEventListener("click", sendInstantMail);
$("mailDailySave")?.addEventListener("click", () => saveMailJob("daily"));
$("mailWeeklySave")?.addEventListener("click", () => saveMailJob("weekly"));
$("mailSmtpSave")?.addEventListener("click", saveSmtpSettings);
$("mailSmtpTest")?.addEventListener("click", testSmtp);
// Port degistiginde Güvenli secimini otomatik ayarla (587 -> STARTTLS, 465 -> SSL/TLS)
$("mailSmtpPort")?.addEventListener("change", () => {
  const p = parseInt(String($("mailSmtpPort").value || "").trim(), 10);
  $("mailSmtpSecure").value = p === 465 ? "true" : "false";
});
$("kbRoleFilter")?.addEventListener("change", loadKartBasim);

/* ---------- Islem Logları (admin) ---------- */
let logsState = { page: 1, pageSize: 50, total: 0 };

function lvlText(level) {
  return `<span class="log-level-${esc(level) || "info"}">${esc(level || "info")}</span>`;
}
function fmtLogVal(v) { return v === null || v === undefined ? "" : String(v); }

async function loadLogs(resetPage = false) {
  if (!isAdmin()) { $("logsTbody").innerHTML = `<tr><td colspan="8" class="px-3 py-4 text-center text-slate-400">Yalnızca yönetici erişebilir.</td></tr>`; return; }
  if (resetPage) logsState.page = 1;
  const params = new URLSearchParams({
    q: $("logsQ")?.value || "",
    level: $("logsLevel")?.value || "",
    action: $("logsAction")?.value || "",
    username: $("logsUsername")?.value || "",
    category: $("logsCategory")?.value || "",
    dateFrom: $("logsDateFrom")?.value || "",
    dateTo: $("logsDateTo")?.value || "",
    page: String(logsState.page),
    pageSize: String(logsState.pageSize),
  });
  for (const k of Array.from(params.keys())) if (!params.get(k)) params.delete(k);
  const data = await api("/api/logs?" + params.toString());
  logsState.total = data.total || 0;
  const rows = data.rows || [];
  $("logsEmpty").classList.toggle("hidden", rows.length !== 0);
  $("logsTbody").innerHTML = rows.map((r) => {
    let detail = "";
    try {
      const d = JSON.parse(r.details_json || "{}");
      detail = Object.keys(d).length ? JSON.stringify(d) : "";
    } catch { detail = r.details_json || ""; }
    return `<tr>
      <td class="px-3 py-2 text-slate-600 whitespace-nowrap">${trDateTime(r.created_at, true)}</td>
      <td class="px-3 py-2 whitespace-nowrap">${lvlText(r.level)}</td>
      <td class="px-3 py-2"><span class="log-action">${esc(r.action)}</span></td>
      <td class="px-3 py-2">${esc(r.username || "—")}</td>
      <td class="px-3 py-2">${esc(ROLE_LABELS[r.role] || r.role || "—")}</td>
      <td class="px-3 py-2">${esc(r.category ? (CATEGORIES.find((c) => c.key === r.category)?.label || r.category) : "—")}</td>
      <td class="px-3 py-2">${fmtLogVal(r.batch_id)}</td>
      <td class="px-3 py-2 text-slate-600 max-w-[28rem] break-words">${esc(detail)}</td>
    </tr>`;
  }).join("");
  const totalPages = Math.max(1, Math.ceil(logsState.total / logsState.pageSize));
  $("logsInfo").textContent = `Toplam ${logsState.total} kayıt · Sayfa ${logsState.page}/${totalPages}`;
  $("logsPage").textContent = `Sayfa ${logsState.page} / ${totalPages}`;
  $("logsPrev").disabled = logsState.page <= 1;
  $("logsNext").disabled = logsState.page >= totalPages;
}

async function exportLogs() {
  if (!isAdmin()) return;
  const res = await fetch(`${API}/api/logs/export.xlsx`, { headers: { "x-session": SESSION } });
  if (!res.ok) { alert("Excel indirilemedi"); return; }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `otokart_log_${buildTimestamp()}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

$("logsApply")?.addEventListener("click", () => loadLogs(true));
$("logsClear")?.addEventListener("click", () => {
  for (const id of ["logsQ", "logsAction", "logsUsername"]) $(id).value = "";
  for (const id of ["logsLevel", "logsCategory"]) $(id).value = "";
  $("logsDateFrom").value = ""; $("logsDateTo").value = "";
  loadLogs(true);
});
$("logsExport")?.addEventListener("click", exportLogs);
$("logsPrev")?.addEventListener("click", () => { if (logsState.page > 1) { logsState.page--; loadLogs(); } });
$("logsNext")?.addEventListener("click", () => { logsState.page++; loadLogs(); });

/* ---------- Users (admin) ---------- */
async function loadUsers() {
  if (!isAdmin()) { $("userList").innerHTML = `<p class="hint">Bu sayfaya yalnızca yönetici erişebilir.</p>`; return; }
  const users = await api("/api/users");
  $("userList").innerHTML = users.map((u) => `
    <div class="flex items-center gap-3 py-3 px-1">
      <div class="w-10 h-10 rounded-full bg-slate-800 text-white grid place-items-center text-xs font-bold uppercase shrink-0">${esc(u.username.slice(0, 2))}</div>
      <div class="min-w-0 flex-1">
        <div class="font-semibold text-slate-800">${esc(u.username)} <span class="badge ${u.role === "admin" ? "printed" : "draft"}" style="margin-left:6px">${esc(u.roleLabel || u.role)}</span></div>
        <div class="text-[11px] text-slate-500">Eklendi: ${u.created_at || "-"}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <select class="form-input !w-auto text-xs py-1.5" data-role-select="${u.id}">
          ${["admin", "ogrenci_isleri", "personel_daire", "akademik", "idari", "operator"].map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${ROLE_LABELS[r]}</option>`).join("")}
        </select>
        <button class="btn small danger" data-del-user="${u.id}" ${u.username === "admin" ? "disabled title=\"Varsayilan admin silinemez\"" : ""}>Sil</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-role-select]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      try {
        await api(`/api/users/${sel.dataset.roleSelect}`, { method: "PUT", body: JSON.stringify({ role: sel.value }) });
        loadUsers();
      } catch (err) { alert(err.message); loadUsers(); }
    });
  });
  document.querySelectorAll("[data-del-user]").forEach((b) => {
    b.addEventListener("click", async () => {
      if (!confirm("Bu kullanıcı silinsin mi?")) return;
      try { await api(`/api/users/${b.dataset.delUser}`, { method: "DELETE" }); loadUsers(); }
      catch (err) { alert(err.message); }
    });
  });
}

$("userForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/users", {
      method: "POST",
      body: JSON.stringify({ username: $("userName").value, password: $("userPass").value, role: $("userRole").value }),
    });
    $("userName").value = "";
    $("userPass").value = "";
    $("userStatus").textContent = "Eklendi ?";
    setTimeout(() => ($("userStatus").textContent = ""), 2500);
    loadUsers();
  } catch (err) { alert(err.message); }
});

/* ---------- Kart Basım: panel aç/kapat ---------- */
document.querySelectorAll(".kb-action").forEach((b) => {
  b.addEventListener("click", () => {
    if (!b.dataset.panel) return; // mail-mode gibi panel olmayan butonlar
    const target = $(b.dataset.panel);
    const other = target === $("kbToplu") ? $("kbManuel") : $("kbToplu");
    other.classList.add("hidden");
    target.classList.toggle("hidden");
  });
});
document.querySelectorAll(".kb-close").forEach((b) => {
  b.addEventListener("click", () => $(b.dataset.close).classList.add("hidden"));
});

/* ---------- Batch creation -> date list refresh ---------- */
const _openBatch = window.openBatch;
window.openBatch = async function (id) {
  await _openBatch(id);
  const t = $("kbToplu");
  if (t) t.classList.add("hidden");
  const m = $("kbManuel");
  if (m) m.classList.add("hidden");
};

/* ---------- Init ---------- */
renderManualFields();
const saved = localStorage.getItem("otokart_session");
const savedRole = localStorage.getItem("otokart_role") || "operator";

// Portal SSO: portal oturumu varsa giris ekrani atlanir (sunucu SSO modunda degilse /api/sso-me 404 doner)
async function trySso() {
  try {
    const res = await fetch(`${API}/api/sso-me`);
    if (res.status === 403) {
      document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem;color:#b91c1c">Bu modülü kullanma yetkiniz yok.</p>';
      return true;
    }
    if (res.status === 401 && (await res.json().catch(() => ({}))).error === "Portal oturumu bulunamadi") {
      document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem">Oturum bulunamadı. Lütfen portala giriş yapın.</p>';
      return true;
    }
    if (!res.ok) return false;
    const me = await res.json();
    SESSION = "sso";
    SESSION_ROLE = me.role;
    await enterApp(me.username, me.role);
    $("logoutBtn").classList.add("hidden"); // cikis portaldan yapilir
    return true;
  } catch {
    return false;
  }
}

trySso().then((handled) => {
  if (handled) return;
if (saved) {
  SESSION = saved;
  SESSION_ROLE = savedRole;
  enterApp(localStorage.getItem("otokart_user") || "kullanıcı", savedRole).catch(() => {
    SESSION = null;
    SESSION_ROLE = "operator";
    localStorage.removeItem("otokart_session");
    $("appView").classList.add("hidden");
    $("loginView").classList.remove("hidden");
  });
}
});
