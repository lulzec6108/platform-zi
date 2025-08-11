// code.gs (REVISED & SECURED)

const ss = SpreadsheetApp.getActiveSpreadsheet();
const SCRIPT_API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');

// --- Fungsi Utility ---
function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- Handlers Utama ---
function doGet(e) {
  // Logger.log('doGet received parameters: ' + JSON.stringify(e.parameter));

  // Validasi API Key
  if (!e || !e.parameter || !e.parameter.apiKey || e.parameter.apiKey !== SCRIPT_API_KEY) {
    return sendJSON({ success: false, message: 'Akses Ditolak: API Key tidak valid atau tidak ada.' });
  }

  const action = e.parameter.action;
  const payload = e.parameter; // Semua parameter adalah payload
  let result;

  try {
    // Routing berdasarkan parameter 'action'
    switch (action) {
      case 'login':
        result = handleLogin(payload);
        break;
      case 'getDashboardTugasStatus':
        result = handleGetDashboardTugasStatus(payload);
        break;
      case 'getLinkPendukung':
        result = handleGetLinkPendukung(payload);
        break;
      case 'getTugasSaya':
        result = handleGetTugasSaya(payload);
        break;
      case 'getKinerjaTim': // <-- BARU: Daftarkan aksi baru
        result = handleGetKinerjaTim(payload);
        break;
      default:
        result = { success: false, message: 'Aksi GET tidak valid.' };
        break;
    }
  } catch (err) {
    Logger.log(`Error in doGet action '${action}': ${err.message} Stack: ${err.stack}`);
    result = { success: false, message: `Terjadi kesalahan server pada aksi: ${action}. Detail: ${err.message}` };
  }

  return sendJSON(result);
}

function doPost(e) {
  let response;
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request; // Seluruh body adalah payload, termasuk username, password, dll.

    if (!action) {
      throw new Error("Aksi POST tidak valid atau tidak ditemukan di body.");
    }

    // Routing berdasarkan 'action'
    switch (action) {
      case 'login':
        response = handleLogin(payload);
        break;
      case 'saveBuktiDukung':
        response = handleSaveBuktiDukung(payload);
        break;
      case 'handleSetStatusPenilaian': // Frontend compatibility
        response = handleSetStatusPenilaian(payload);
        break;
      case 'setStatusPenilaian':
        response = handleSetStatusPenilaian(payload);
        break;
      default:
        response = { success: false, message: `Aksi POST '${action}' tidak dikenali.` };
        break;
    }
  } catch (error) {
    Logger.log(`Error in doPost: ${error.message}`);
    response = { success: false, message: `Gagal memproses permintaan POST: ${error.message}` };
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// --- FUNGSI-FUNGSI LOGIKA BISNIS ANDA ---
function handleGetDashboardTugasStatus(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) return { success: false, message: 'User tidak ditemukan' };

  const tugasSheet = ss.getSheetByName("MappingTugas");
  const tugasData = tugasSheet.getDataRange().getValues();
  const buktiSheet = ss.getSheetByName("BuktiDukung");
  const buktiData = buktiSheet.getDataRange().getValues();
  const usersSheet = ss.getSheetByName("Users");
  const usersData = usersSheet.getDataRange().getValues();

  const usernameToNama = {};
  for (let i = 1; i < usersData.length; i++) {
    usernameToNama[usersData[i][0]] = usersData[i][2];
  }

  const hasil = [];
  for (let i = 1; i < tugasData.length; i++) {
    const row = tugasData[i];
    const kode = row[6];
    const pilar = row[1];
    const tugasUsername = row[0];
    const namaLengkap = usernameToNama[tugasUsername] || tugasUsername;

    let tampil = false;
    if (user.role && user.role.toLowerCase() === "admin") tampil = true;
    else if (user.role && user.role.toLowerCase() === "ketua pilar" && user.pilar === pilar) tampil = true;
    else if (user.role && user.role.toLowerCase() === "anggota" && user.username === tugasUsername) tampil = true;
    if (!tampil) continue;

    let ada = false;
    let statusKetua = "", catatanKetua = "", statusAdmin = "", catatanAdmin = "";
    for (let j = 1; j < buktiData.length; j++) {
      if (buktiData[j][0] == tugasUsername && buktiData[j][1] == kode) {
        ada = (buktiData[j][3] && buktiData[j][3].toString().trim() !== "") || (buktiData[j][2] && buktiData[j][2].toString().trim() !== "");
        statusKetua = buktiData[j][5] || "";
        catatanKetua = buktiData[j][6] || "";
        statusAdmin = buktiData[j][7] || "";
        catatanAdmin = buktiData[j][8] || "";
        break;
      }
    }
    hasil.push({
      kode: kode,
      pilar: pilar,
      nama: row[5],
      tugasUsername: tugasUsername,
      namaLengkap: namaLengkap,
      statusAnggota: ada ? "Sudah dikerjakan" : "Belum dikerjakan",
      statusKetua: statusKetua,
      catatanKetua: catatanKetua,
      statusAdmin: statusAdmin,
      catatanAdmin: catatanAdmin,
      linkReferensiMelawi: row[9] || "",
      linkGDriveBukti: row[10] || ""
    });
  }
  return { success: true, data: hasil };
}

function handleGetMappingTugasForUser(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) return { success: false, message: 'User tidak ditemukan' };

  const tugasSheet = ss.getSheetByName("MappingTugas");
  const tugasData = tugasSheet.getDataRange().getValues();
  const hasil = [];

  for (let i = 1; i < tugasData.length; i++) {
    const row = tugasData[i];
    if (row[0] === user.username) {
      hasil.push({ pilar: row[1], kategori: row[2], subkategori: row[3], tugas: row[4], definisi: row[5], kode: row[6] });
    }
  }
  return { success: true, data: hasil };
}

function handleGetBuktiDukung(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      return { 
        success: true, 
        data: {
          nilai: data[i][2], 
          jenis: data[i][3],
          statusKetua: data[i][5] || "",
          catatanKetua: data[i][6] || "",
          statusAdmin: data[i][7] || "",
          catatanAdmin: data[i][8] || ""
        }
      };
    }
  }
  return { success: true, data: { nilai: "", jenis: "", statusKetua: "", catatanKetua: "", statusAdmin: "", catatanAdmin: "" } };
}

function handleGetLinkPendukung(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) {
    return { success: false, message: 'User tidak ditemukan' };
  }

  const sheet = ss.getSheetByName("LinkPendukung"); // FIX: Nama sheet disesuaikan (tanpa spasi)
  if (!sheet) {
    // Jika sheet tidak ditemukan, kirim pesan error yang jelas
    Logger.log('Error: Sheet dengan nama "LinkPendukung" tidak ditemukan.');
    return { success: false, message: 'Sheet "LinkPendukung" tidak ditemukan.' };
  }
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Ambil header untuk dijadikan key

  const result = data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Mengubah header menjadi snake_case untuk konsistensi kunci JSON
      const key = header.trim().toLowerCase().replace(/\s+/g, '_');
      obj[key] = row[index];
    });
    return obj;
  }).filter(item => Object.keys(item).length > 0 && item.judul_link && item.alamat_link); // Filter baris kosong

  return { success: true, data: result };
}

function handleGetTugasSaya(payload) {
  const user = getUserInfo(payload.username);
  if (!user || !user.username) return { success: false, message: 'User tidak ditemukan' };

  const tugasSheet = ss.getSheetByName("MappingTugas");
  const tugasData = tugasSheet.getDataRange().getValues();
  const tugasHeaders = tugasData.shift(); // Ambil header untuk pencarian kolom dinamis

  // Dapatkan indeks kolom dari header
  const usernameIndex = tugasHeaders.indexOf('Username');
  const tingkatan1Index = tugasHeaders.indexOf('Tingkatan 1');
  const tingkatan2Index = tugasHeaders.indexOf('Tingkatan 2');
  const tingkatan3Index = tugasHeaders.indexOf('Tingkatan 3');
  const tingkatan4Index = tugasHeaders.indexOf('Tingkatan 4');
  const panduanIndex = tugasHeaders.indexOf('Panduan Penilaian');
  const kodeHirarkiIndex = tugasHeaders.indexOf('Kode Hirarki');
  const pilihanJawabanIndex = tugasHeaders.indexOf('Pilihan Jawaban');
  // === PENAMBAHAN BARU ===
  const linkReferensiIndex = tugasHeaders.indexOf('Link Referensi Melawi');
  const linkGDriveBuktiIndex = tugasHeaders.indexOf('Link GDrive Bukti');

  const buktiSheet = ss.getSheetByName("BuktiDukung");
  const buktiData = buktiSheet.getDataRange().getValues();
  const buktiHeaders = buktiData.shift();

  // Buat map dari bukti dukung untuk pencarian cepat (O(1) lookup)
  const buktiDukungMap = buktiData.reduce((map, row) => {
    const username = row[buktiHeaders.indexOf('Username')];
    const kodeHirarki = row[buktiHeaders.indexOf('Kode Hirarki')];
    const idxStatusKetua = buktiHeaders.indexOf('Status Ketua Pilar');
    const idxStatusAdmin = buktiHeaders.indexOf('Status Admin');
    if (username && kodeHirarki) {
      map[`${username}-${kodeHirarki}`] = {
        nilai: row[buktiHeaders.indexOf('Nilai')],
        jenisBuktiDukung: row[buktiHeaders.indexOf('Jenis Bukti Dukung')],
        timestamp: row[buktiHeaders.indexOf('Timestamp')],
        statusUser: row[buktiHeaders.indexOf('Status User')] || '',
        statusKetua: idxStatusKetua !== -1 ? (row[idxStatusKetua] || '') : '',
        statusAdmin: idxStatusAdmin !== -1 ? (row[idxStatusAdmin] || '') : ''
      };
    }
    return map;
  }, {});

  const userTugas = [];
  tugasData.forEach(row => {
    const tugasUsername = row[usernameIndex];
    if (tugasUsername === user.username) {
      const kodeHirarki = row[kodeHirarkiIndex];
      const buktiKey = `${user.username}-${kodeHirarki}`;
      const bukti = buktiDukungMap[buktiKey] || {}; // Ambil bukti atau objek kosong

      // Tentukan status pengerjaan berdasarkan keberadaan data di BuktiDukung
      const statusPengerjaan = buktiDukungMap.hasOwnProperty(buktiKey) ? "SEDANG DIKERJAKAN" : "BELUM DIKERJAKAN";

      userTugas.push({
        username: tugasUsername,
        pilar: row[1],
        tingkatan1: row[tingkatan1Index],
        tingkatan2: row[tingkatan2Index],
        tingkatan3: row[tingkatan3Index],
        tingkatan4: row[tingkatan4Index],
        kodeHirarki: kodeHirarki,
        panduanPenilaian: row[panduanIndex],
        pilihanJawaban: row[pilihanJawabanIndex],
        // === PENAMBAHAN BARU ===
        linkReferensi: linkReferensiIndex !== -1 ? row[linkReferensiIndex] : '',
        linkGDriveBukti: linkGDriveBuktiIndex !== -1 ? row[linkGDriveBuktiIndex] : '',
        // Gabungkan dengan data dari bukti dukung
        nilai: bukti.nilai || '',
        jenisBuktiDukung: bukti.jenisBuktiDukung || '',
        statusUser: bukti.statusUser || '',
        statusKetua: bukti.statusKetua || '',
        statusAdmin: bukti.statusAdmin || '',
        // Tambahkan status pengerjaan
        statusPengerjaan: statusPengerjaan
      });
    }
  });

  return { success: true, data: userTugas };
}

function handleGetKinerjaTim(payload) {
  const sheet = ss.getSheetByName("BuktiDukung");
  const data = sheet.getDataRange().getValues();
  // Logika untuk mengambil dan memfilter data kinerja tim akan ditambahkan di sini
  return { success: true, data: data }; // Placeholder
}

function handleLogin(payload) {
  const { username, password } = payload;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users'); 
    if (!sheet) {
      return { success: false, message: 'Error: Sheet dengan nama \'Users\' tidak ditemukan.' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    const usernameIndex = headers.indexOf('Username');
    const passwordIndex = headers.indexOf('Password');
    const namaIndex = headers.indexOf('Nama Lengkap');
    const pilarIndex = headers.indexOf('Pilar');
    const roleIndex = headers.indexOf('Role');

    for (const row of data) {
      if (row[usernameIndex] === username && row[passwordIndex].toString() === password.toString()) {
        return {
          success: true,
          data: {
            username: row[usernameIndex],
            nama: row[namaIndex],
            pilar: row[pilarIndex],
            role: row[roleIndex]
          }
        };
      }
    }
    
    return { success: false, message: 'Username atau password salah.' };

  } catch (e) {
    Logger.log('Login error: ' + e.toString());
    return { success: false, message: 'Terjadi kesalahan pada server saat login.' };
  }
}

function handleSaveBuktiDukung(payload) {
  const sheet = ss.getSheetByName("BuktiDukung");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const usernameIndex = headers.indexOf('Username');
  const kodeIndex = headers.indexOf('Kode Hirarki');
  const nilaiIndex = headers.indexOf('Nilai');
  const jenisIndex = headers.indexOf('Jenis Bukti Dukung');
  const timestampIndex = headers.indexOf('Timestamp');
  const statusUserIndex = headers.indexOf('Status User');
  const statusKetuaPilarIndex = headers.indexOf('Status Ketua Pilar');
  const catatanKetuaIndex = headers.indexOf('Catatan Ketua Pilar');
  const statusAdminIndex = headers.indexOf('Status Admin');
  const catatanAdminIndex = headers.indexOf('Catatan Admin');

  const username = payload.username;
  const submissionType = payload.submissionType;

  if (!username) {
    return { success: false, message: 'Sesi pengguna tidak ditemukan. Silakan login ulang.' };
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i][usernameIndex] == username && data[i][kodeIndex] == payload.kodeHirarki) {
      const rowIndex = i + 2;
      const statusKetua = (data[i][statusKetuaPilarIndex] || '').toString();
      const statusAdmin = (data[i][statusAdminIndex] || '').toString();
      const k = statusKetua.toLowerCase();
      const a = statusAdmin.toLowerCase();
      const ketuaApproved = k.includes('approved') || k.includes('disetujui') || k.includes('diterima') || k.includes('terverifikasi');
      const ketuaPending  = k.includes('menunggu') || k.includes('pending') || k.includes('verifikasi');
      const ketuaRejected = k.includes('rejected') || k.includes('ditolak');
      const adminApproved = a.includes('approved') || a.includes('disetujui') || a.includes('diterima') || a.includes('terverifikasi');
      const adminRejected = a.includes('rejected') || a.includes('ditolak');

      const isLocked = ketuaPending || ketuaApproved || adminApproved;
      const isRejected = ketuaRejected || adminRejected;

      if (isLocked && !isRejected) {
        return { success: false, message: 'Tugas sudah dikunci dan tidak dapat diubah. Hubungi Ketua Pilar atau Admin jika perlu revisi.' };
      }

      sheet.getRange(rowIndex, nilaiIndex + 1).setValue(payload.nilai);
      sheet.getRange(rowIndex, jenisIndex + 1).setValue(payload.jenisBuktiDukung);
      sheet.getRange(rowIndex, timestampIndex + 1).setValue(new Date());

      if (submissionType === 'draft') {
        sheet.getRange(rowIndex, statusUserIndex + 1).setValue("Sedang Mengerjakan");
      } else if (submissionType === 'final') {
        sheet.getRange(rowIndex, statusUserIndex + 1).setValue("Terkirim");
        sheet.getRange(rowIndex, statusKetuaPilarIndex + 1).setValue("Menunggu Verifikasi");
        sheet.getRange(rowIndex, catatanKetuaIndex + 1).setValue("");
        sheet.getRange(rowIndex, statusAdminIndex + 1).setValue("");
        sheet.getRange(rowIndex, catatanAdminIndex + 1).setValue("");
      }
      
      return { success: true, message: "Bukti dukung berhasil diperbarui." };
    }
  }

  const newRow = new Array(headers.length).fill('');
  newRow[usernameIndex] = username;
  newRow[kodeIndex] = payload.kodeHirarki;
  newRow[nilaiIndex] = payload.nilai;
  newRow[jenisIndex] = payload.jenisBuktiDukung;
  newRow[timestampIndex] = new Date();

  if (submissionType === 'draft') {
    newRow[statusUserIndex] = "Sedang Mengerjakan";
  } else if (submissionType === 'final') {
    newRow[statusUserIndex] = "Terkirim";
    newRow[statusKetuaPilarIndex] = "Menunggu Verifikasi";
  }
  
  sheet.appendRow(newRow);
  return { success: true, message: "Bukti dukung berhasil disimpan." };
}

function handleSetStatusPenilaian(payload) {
  const sheet = ss.getSheetByName('BuktiDukung');
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length === 0) return { success: false, message: 'Sheet BuktiDukung kosong.' };

  // Header-based indices for robustness
  const headers = values[0];
  const idxUsername = headers.indexOf('Username');
  const idxKode = headers.indexOf('Kode Hirarki');
  const idxStatusKetua = headers.indexOf('Status Ketua Pilar');
  const idxCatatanKetua = headers.indexOf('Catatan Ketua Pilar');
  const idxStatusAdmin = headers.indexOf('Status Admin');
  const idxCatatanAdmin = headers.indexOf('Catatan Admin');
  const idxTimestamp = headers.indexOf('Timestamp');

  if ([idxUsername, idxKode].some(i => i < 0)) {
    return { success: false, message: 'Header kolom tidak lengkap di sheet BuktiDukung.' };
  }

  const role = String(payload.role || '').toLowerCase();
  const targetUser = payload.targetUsername || payload.username; // fallback
  const kode = payload.kodeHirarki;
  if (!targetUser || !kode) return { success: false, message: 'Parameter targetUsername/kodeHirarki tidak lengkap.' };

  // Find row by (username, kode hirarki)
  let rowIndex = -1; // 1-based row index
  for (let i = 1; i < values.length; i++) {
    if ((values[i][idxUsername] || '') == targetUser && (values[i][idxKode] || '') == kode) {
      rowIndex = i + 1;
      break;
    }
  }

  // Prepare write columns per role
  let statusCol = -1, catatanCol = -1;
  if (role.includes('admin')) {
    statusCol = idxStatusAdmin;
    catatanCol = idxCatatanAdmin;
  } else if (role.includes('ketua')) {
    statusCol = idxStatusKetua;
    catatanCol = idxCatatanKetua;
  } else {
    return { success: false, message: 'Role tidak diizinkan.' };
  }
  if (statusCol < 0 || catatanCol < 0) {
    return { success: false, message: 'Kolom status/catatan untuk peran tidak ditemukan.' };
  }

  const now = new Date();
  if (rowIndex > 0) {
    // Update
    sheet.getRange(rowIndex, statusCol + 1).setValue(payload.status || '');
    sheet.getRange(rowIndex, catatanCol + 1).setValue(payload.catatan || '');
    if (idxTimestamp >= 0) sheet.getRange(rowIndex, idxTimestamp + 1).setValue(now);
    return { success: true, message: 'Status berhasil diperbarui.' };
  } else {
    // Append new with 10 columns respecting header order
    const newRow = new Array(headers.length).fill('');
    newRow[idxUsername] = targetUser;
    newRow[idxKode] = kode;
    if (idxTimestamp >= 0) newRow[idxTimestamp] = now;
    newRow[statusCol] = payload.status || '';
    newRow[catatanCol] = payload.catatan || '';
    sheet.appendRow(newRow);
    return { success: true, message: 'Status berhasil ditambahkan.' };
  }
}

function getUserInfo(username) {
  if (!username) return {};
  var sheet = ss.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      return { username: username, nama: data[i][2], pilar: data[i][3], role: data[i][4] };
    }
  }
  return {};
}
